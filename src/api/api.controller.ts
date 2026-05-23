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
import { randomUUID } from 'crypto';

@Controller('api/v1/generate')
export class ApiController {
  private readonly logger = new Logger(ApiController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueuesService,
  ) {}

  @Post('enqueue')
  async enqueueGenerationJob(
    @Body() body: { generationId: string; dto: GenerateDto },
  ) {
    const { generationId, dto } = body;
    const destinationLabel =
      dto.trip_details.destination?.trim() || 'AI to Decide';
    
    this.logger.log(
      `Received AI generation enqueue request for ID: ${generationId}. Origin: "${dto.trip_details.origin}", Destination: "${destinationLabel}"`,
    );

    // Dispatch the complete payload directly to the BullMQ queue
    await this.queues.addGenerationJob(generationId, dto);

    this.logger.log(
      `Dispatched background generation job to queue for ID: ${generationId}`,
    );

    return {
      status: 'success',
      message: 'Travel generation job successfully queued',
    };
  }

  @Get(':id')
  async getGenerationStatus(@Param('id') id: string) {
    this.logger.log(`Retrieving status for generation job: ${id}`);

    const trip = await this.prisma.trip.findUnique({
      where: { generationId: id },
    });

    if (!trip) {
      throw new NotFoundException(`Generation job with ID "${id}" not found`);
    }

    // Extract stepsCompleted telemetry logs from metadata
    const stepsCompleted = Array.isArray(trip.metadata)
      ? trip.metadata
          .filter((o: any) => o && typeof o === 'object' && 'stepName' in o)
          .map((o: any) => ({
            stepName: o.stepName,
            validationPassed: o.validationPassed,
            error: o.error,
            createdAt: o.createdAt,
          }))
      : [];

    const item = {
      generationId: trip.generationId,
      status: trip.status,
      error: trip.error,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
      stepsCompleted,
      payload: trip.payload, // Complete POST input payload parameters
      response: trip.response, // Complete generated itinerary output response
    };

    return {
      status: 'success',
      data: [item],
    };
  }
}
