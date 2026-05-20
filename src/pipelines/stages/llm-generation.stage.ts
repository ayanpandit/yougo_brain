import { Injectable, Logger } from '@nestjs/common';
import {
  BaseLlmProvider,
  LlmResponse,
} from '../../providers/base/llm.provider';
import { GroqProvider } from '../../providers/llm/groq.provider';

@Injectable()
export class LlmGenerationStage {
  private readonly logger = new Logger(LlmGenerationStage.name);

  constructor(
    private readonly primaryLlmProvider: BaseLlmProvider,
    private readonly fallbackLlmProvider: GroqProvider, // Injected for robust dual-provider failover
  ) {}

  async execute(compiledPrompt: string, useJson = true): Promise<LlmResponse> {
    this.logger.log(
      `Executing LLM Generation Stage using primary provider: ${this.primaryLlmProvider.getName()}`,
    );

    try {
      return await this.primaryLlmProvider.generate({
        systemPrompt:
          'You are an accurate, highly specialized travel AI orchestration assistant.',
        userPrompt: compiledPrompt,
        temperature: 0.5,
        responseFormat: useJson ? 'json' : 'text',
      });
    } catch (primaryError: any) {
      this.logger.warn(
        `Primary LLM provider (${this.primaryLlmProvider.getName()}) failed: ${primaryError.message}. Routing failover to Groq (Llama 3.3)...`,
      );

      try {
        const fallbackResponse = await this.fallbackLlmProvider.generate({
          systemPrompt:
            'You are an accurate, highly specialized travel AI orchestration assistant.',
          userPrompt: compiledPrompt,
          temperature: 0.5,
          responseFormat: useJson ? 'json' : 'text',
        });

        this.logger.log('Groq failover completed successfully!');
        return fallbackResponse;
      } catch (fallbackError: any) {
        this.logger.error('All LLM providers failed to execute generation!');
        throw new Error(`Orchestration LLM Crash: ${fallbackError.message}`);
      }
    }
  }
}
