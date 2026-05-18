import { Injectable, Logger } from '@nestjs/common';
import { EnrichmentStage } from '../pipelines/stages/enrichment.stage';
import { PromptCompilationStage } from '../pipelines/stages/prompt-compilation.stage';
import { LlmGenerationStage } from '../pipelines/stages/llm-generation.stage';
import { ValidationStage } from '../pipelines/stages/validation.stage';
import { PersistenceStage } from '../pipelines/stages/persistence.stage';
import { Itinerary } from '../schemas/itinerary.schema';

export interface GenerationPayload {
  destination: string;
  durationDays: number;
  preferences?: string;
}

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly enrichmentStage: EnrichmentStage,
    private readonly promptCompilationStage: PromptCompilationStage,
    private readonly llmGenerationStage: LlmGenerationStage,
    private readonly validationStage: ValidationStage,
    private readonly persistenceStage: PersistenceStage,
  ) {}

  async orchestrate(generationId: string, payload: GenerationPayload): Promise<Itinerary> {
    this.logger.log(`[Orchestrator] Starting workflow for Generation ${generationId}`);

    const destination = payload.destination;
    const durationDays = payload.durationDays || 3;
    const preferences = payload.preferences || 'Standard leisure trip';

    // =========================================================================
    // STAGE 1: ENRICHMENT (MAPS + WEATHER)
    // =========================================================================
    const enrichment = await this.enrichmentStage.execute(destination);
    
    await this.persistenceStage.execute({
      generationId,
      stepName: 'enrichment',
      payload: enrichment,
      validationPassed: true,
    });

    // =========================================================================
    // STAGE 2: PROMPT COMPILATION
    // =========================================================================
    const compiledPrompt = await this.promptCompilationStage.execute({
      destination,
      durationDays,
      preferences,
      enrichment,
    });

    // =========================================================================
    // STAGE 3: LLM GENERATION
    // =========================================================================
    const llmResponse = await this.llmGenerationStage.execute(compiledPrompt);

    await this.persistenceStage.execute({
      generationId,
      stepName: 'llm-generation',
      payload: {
        rawContent: llmResponse.content,
        modelUsed: llmResponse.model,
        usage: llmResponse.usage,
      },
      validationPassed: true,
    });

    // =========================================================================
    // STAGE 4: VALIDATION & PARSING
    // =========================================================================
    try {
      const parsedItinerary = this.validationStage.execute(llmResponse.content);

      await this.persistenceStage.execute({
        generationId,
        stepName: 'validation',
        payload: parsedItinerary,
        validationPassed: true,
      });

      this.logger.log(`[Orchestrator] Workflow completed successfully for Generation ${generationId}!`);
      return parsedItinerary;

    } catch (validationError: any) {
      this.logger.error(`[Orchestrator] Validation failed at stage 4 for Generation ${generationId}`);

      await this.persistenceStage.execute({
        generationId,
        stepName: 'validation',
        payload: { rawContent: llmResponse.content },
        validationPassed: false,
        error: validationError.message || 'Itinerary format validation failed',
      });

      throw validationError; // Bubble up to trigger job retries if appropriate
    }
  }
}
