import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from '../database/prisma.service';
import { OrchestrationService } from '../orchestration/orchestration.service';
import { GenerationStatus } from '@prisma/client';

@Injectable()
export class GenerationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GenerationWorker.name);
  private redisConnection: Redis;
  private worker: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly orchestrationService: OrchestrationService,
  ) {}

  onModuleInit() {
    const host = this.configService.get<string>('app.redis.host', 'localhost');
    const port = this.configService.get<number>('app.redis.port', 6379);

    this.logger.log(`Spinning up GenerationWorker subscribing to Redis at ${host}:${port}...`);
    this.redisConnection = new Redis({
      host,
      port,
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker(
      'generation-queue',
      async (job: Job) => {
        return await this.processJob(job);
      },
      {
        connection: this.redisConnection,
        concurrency: 5, // Concurrency limit: 5 dynamic AI pipelines in parallel
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed in worker execution:`, err);
    });

    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} marked COMPLETED in worker!`);
    });
  }

  private async processJob(job: Job) {
    const { generationId, payload } = job.data;
    this.logger.log(`[Worker] Started processing job ${job.id} for Generation ${generationId}`);

    // Update state to PROCESSING
    await this.prisma.generation.update({
      where: { id: generationId },
      data: { status: GenerationStatus.PROCESSING },
    });

    try {
      // Execute the orchestration flow
      const result = await this.orchestrationService.orchestrate(generationId, payload);

      // Update state to COMPLETED
      await this.prisma.generation.update({
        where: { id: generationId },
        data: { 
          status: GenerationStatus.COMPLETED,
          metadata: {
            durationMs: Date.now() - job.timestamp,
            attempts: job.attemptsMade,
          }
        },
      });

      this.logger.log(`[Worker] Generation ${generationId} processed successfully!`);
      return result;

    } catch (error: any) {
      this.logger.error(`[Worker] Error processing Generation ${generationId}:`, error);

      // Update state to FAILED
      await this.prisma.generation.update({
        where: { id: generationId },
        data: { 
          status: GenerationStatus.FAILED,
          error: error.message || 'Unknown generation error',
        },
      });

      throw error; // Re-throw to let BullMQ handle retry mechanism
    }
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down GenerationWorker thread...');
    await this.worker.close();
    await this.redisConnection.quit();
  }
}
