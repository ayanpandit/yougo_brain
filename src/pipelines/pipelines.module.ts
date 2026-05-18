import { Module } from '@nestjs/common';
import { ProvidersModule } from '../providers/providers.module';
import { PromptsModule } from '../prompts/prompts.module';
import { ValidationModule } from '../validation/validation.module';
import { EnrichmentStage } from './stages/enrichment.stage';
import { PromptCompilationStage } from './stages/prompt-compilation.stage';
import { LlmGenerationStage } from './stages/llm-generation.stage';
import { ValidationStage } from './stages/validation.stage';
import { PersistenceStage } from './stages/persistence.stage';

@Module({
  imports: [ProvidersModule, PromptsModule, ValidationModule],
  providers: [
    EnrichmentStage,
    PromptCompilationStage,
    LlmGenerationStage,
    ValidationStage,
    PersistenceStage,
  ],
  exports: [
    EnrichmentStage,
    PromptCompilationStage,
    LlmGenerationStage,
    ValidationStage,
    PersistenceStage,
  ],
})
export class PipelinesModule {}
