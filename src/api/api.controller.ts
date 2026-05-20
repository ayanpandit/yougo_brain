import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  NotFoundException,
  Logger,
} from '@nestjs/common';
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
    const destinationLabel =
      dto.trip_details.destination?.trim() || 'AI to Decide';
    this.logger.log(
      `Received travel generation request: Origin: "${dto.trip_details.origin}", Destination: "${destinationLabel}"`,
    );

    // 1. Create a persistent generation tracking entry with complete DTO payload
    const generation = await this.prisma.generation.create({
      data: {
        status: GenerationStatus.PENDING,
        promptParams: dto as any, // Save complete dynamic JSON payload
      },
    });

    this.logger.log(
      `Created PENDING generation record with ID: ${generation.id}`,
    );

    // 2. Dispatch the complete nested payload to the BullMQ queue
    await this.queues.addGenerationJob(generation.id, dto);

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

    // Extract the final repaired validation payload if completed
    const finalOutput =
      generation.status === GenerationStatus.COMPLETED
        ? generation.outputs.find((o) => o.stepName === 'validation')?.payload
        : null;

    const item = {
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
      payload: generation.promptParams, // Complete POST input payload parameters
      response: finalOutput, // Complete generated itinerary output response
      ...(finalOutput as any), // Flat itinerary fields for maximum frontend ease of use
    };

    return {
      status: 'success',
      data: [item],
    };
  }
}
