import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './configs/app.config';
import { validateEnv } from './configs/env.validation';
import { PrismaModule } from './database/prisma.module';
import { QueuesModule } from './queues/queues.module';
import { WorkersModule } from './workers/workers.module';
import { ProvidersModule } from './providers/providers.module';
import { PromptsModule } from './prompts/prompts.module';
import { ValidationModule } from './validation/validation.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { OrchestrationModule } from './orchestration/orchestration.module';
import { ObservabilityModule } from './observability/observability.module';
import { ApiModule } from './api/api.module';

@Module({
  imports: [
    // Centralized environment validation and parsing schema
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
    }),
    PrismaModule,
    QueuesModule,
    WorkersModule,
    ProvidersModule,
    PromptsModule,
    ValidationModule,
    PipelinesModule,
    OrchestrationModule,
    ObservabilityModule,
    ApiModule,
  ],
})
export class AppModule {}
