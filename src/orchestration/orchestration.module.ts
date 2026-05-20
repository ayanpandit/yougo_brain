import { Module } from '@nestjs/common';
import { PipelinesModule } from '../pipelines/pipelines.module';
import { ProvidersModule } from '../providers/providers.module';
import { OrchestrationService } from './orchestration.service';

@Module({
  imports: [PipelinesModule, ProvidersModule],
  providers: [OrchestrationService],
  exports: [OrchestrationService],
})
export class OrchestrationModule {}
