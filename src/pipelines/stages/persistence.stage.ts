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
      const output = await this.prisma.generationOutput.create({
        data: {
          generationId: input.generationId,
          stepName: input.stepName,
          payload: input.payload, // Auto-persists into native PostgreSQL JSONB format!
          validationPassed: input.validationPassed,
          error: input.error,
        },
      });

      this.logger.log(
        `Step "${input.stepName}" successfully persisted in DB! ID: ${output.id}`,
      );
      return output;
    } catch (err: any) {
      this.logger.error(
        `Failed to write persistence for step "${input.stepName}":`,
        err.message,
      );
      throw err;
    }
  }
}
