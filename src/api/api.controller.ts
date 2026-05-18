import { Controller, Post, Get, Body, Param, NotFoundException, Logger } from '@nestjs/common';
import { GenerateDto } from './generate.dto';
import { PrismaService } from '../database/prisma.service';
import { QueuesService } from '../queues/queues.service';
import { GenerationStatus } from '@prisma/client';

@Controller('api/v1/generate')
export class ApiController {
  private readonly logger = new Logger(ApiController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueuesService,
  ) {}

  @Post()
  async generateItinerary(@Body() dto: GenerateDto) {
    this.logger.log(`Received asynchronous generation request for: "${dto.destination}"`);

    // 1. Create a persistent generation tracking entry
    const generation = await this.prisma.generation.create({
      data: {
        status: GenerationStatus.PENDING,
        promptParams: {
          destination: dto.destination,
          durationDays: dto.durationDays,
          preferences: dto.preferences || '',
        },
      },
    });

    this.logger.log(`Created PENDING generation record with ID: ${generation.id}`);

    // 2. Dispatch the job to the BullMQ queue
    await this.queues.addGenerationJob(generation.id, {
      destination: dto.destination,
      durationDays: dto.durationDays,
      preferences: dto.preferences,
    });

    // 3. Return the generation ID instantly to prevent blocking connection
    return {
      status: 'success',
      message: 'Travel generation job successfully queued',
      data: {
        generationId: generation.id,
        status: GenerationStatus.PENDING,
      },
    };
  }

  @Get(':id')
  async getGenerationStatus(@Param('id') id: string) {
    this.logger.log(`Retrieving status for generation job: ${id}`);

    const generation = await this.prisma.generation.findUnique({
      where: { id },
      include: {
        outputs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!generation) {
      throw new NotFoundException(`Generation job with ID "${id}" not found`);
    }

    return {
      status: 'success',
      data: {
        generationId: generation.id,
        status: generation.status,
        error: generation.error,
        createdAt: generation.createdAt,
        updatedAt: generation.updatedAt,
        stepsCompleted: generation.outputs.map((o) => ({
          stepName: o.stepName,
          validationPassed: o.validationPassed,
          error: o.error,
          createdAt: o.createdAt,
        })),
        // Expose final output payload if completed
        output: generation.status === GenerationStatus.COMPLETED
          ? generation.outputs.find((o) => o.stepName === 'validation')?.payload
          : null,
      },
    };
  }
}
