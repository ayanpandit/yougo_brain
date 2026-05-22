import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface PersistenceInput {
  generationId: string;
  stepName: string;
  payload: any;
  validationPassed: boolean;
  error?: string;
}

@Injectable()
export class PersistenceStage {
  private readonly logger = new Logger(PersistenceStage.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(input: PersistenceInput) {
    this.logger.log(
      `Executing Persistence Stage: saving step "${input.stepName}" for Generation ${input.generationId}...`,
    );

    try {
      // 1. Fetch the existing Trip record
      const trip = await this.prisma.trip.findUnique({
        where: { generationId: input.generationId },
      });

      if (!trip) {
        throw new Error(
          `Trip with generation ID "${input.generationId}" not found in database`,
        );
      }

      // 2. Read the current metadata list and append the new step telemetry
      const currentMetadata = Array.isArray(trip.metadata) ? trip.metadata : [];
      const updatedMetadata = [
        ...currentMetadata,
        {
          stepName: input.stepName,
          validationPassed: input.validationPassed,
          error: input.error || null,
          createdAt: new Date(),
        },
      ];

      // 3. Prepare the database update data
      const updateData: any = {
        metadata: updatedMetadata,
      };

      // 4. If this is the final validation stage and it passed, save the itinerary directly inside the response column!
      if (input.stepName === 'validation' && input.validationPassed) {
        updateData.response = input.payload;
      }

      // 5. Commit update
      const updatedTrip = await this.prisma.trip.update({
        where: { generationId: input.generationId },
        data: updateData,
      });

      this.logger.log(
        `Step "${input.stepName}" successfully persisted in Trip metadata!`,
      );
      return updatedTrip;
    } catch (err: any) {
      this.logger.error(
        `Failed to write persistence for step "${input.stepName}":`,
        err.message,
      );
      throw err;
    }
  }
}
