import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class QueuesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueuesService.name);
  private redisConnection: Redis;
  private generationQueue: Queue;
  private queueEvents: QueueEvents;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('app.redis.url');
    if (redisUrl) {
      this.logger.log(`Connecting to Redis using connection URL...`);
      this.redisConnection = new Redis(redisUrl, {
        maxRetriesPerRequest: null, // Critical requirement for BullMQ
      });
    } else {
      const host = this.configService.get<string>('app.redis.host', 'localhost');
      const port = this.configService.get<number>('app.redis.port', 6379);
      this.logger.log(`Connecting to Redis at ${host}:${port}...`);
      this.redisConnection = new Redis({
        host,
        port,
        maxRetriesPerRequest: null, // Critical requirement for BullMQ
      });
    }

    this.redisConnection.on('connect', () => {
      this.logger.log('Successfully connected to Redis!');
    });

    this.redisConnection.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const queueName =
      nodeEnv === 'production'
        ? 'brain-generation-queue'
        : 'dev-brain-generation-queue';

    // Initialize BullMQ generation queue
    this.generationQueue = new Queue(queueName, {
      connection: this.redisConnection,
      prefix: 'brain',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // starts at 2s, then 4s, then 8s
        },
        removeOnComplete: true, // Keep DB clean
        removeOnFail: { count: 100 }, // Keep some failures for debugging/dead-letter analyses
      },
    });

    // Monitor queue events for trace observability
    this.queueEvents = new QueueEvents(queueName, {
      connection: this.redisConnection,
      prefix: 'brain',
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.error(`Job ${jobId} failed: ${failedReason}`);
    });

    this.queueEvents.on('completed', ({ jobId }) => {
      this.logger.log(`Job ${jobId} completed successfully!`);
    });
  }

  async addGenerationJob(generationId: string, payload: any) {
    this.logger.log(`Queueing generation job for ID: ${generationId}`);
    return await this.generationQueue.add(
      'generate-itinerary',
      { generationId, payload },
      {
        jobId: generationId, // Use the generation ID as the unique job ID
      },
    );
  }

  getQueue(): Queue {
    return this.generationQueue;
  }

  async onModuleDestroy() {
    this.logger.log('Closing queue instances and Redis connection...');
    await this.generationQueue.close();
    await this.queueEvents.close();
    await this.redisConnection.quit();
  }
}
