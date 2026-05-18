import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GenerationWorker } from './generation.worker';
import { OrchestrationModule } from '../orchestration/orchestration.module';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [ConfigModule, OrchestrationModule, PrismaModule],
  providers: [GenerationWorker],
  exports: [GenerationWorker],
})
export class WorkersModule {}
