import { Injectable, Logger } from '@nestjs/common';
import { ValidationService } from '../../validation/validation.service';
import { itinerarySchema, Itinerary } from '../../schemas/itinerary.schema';

@Injectable()
export class ValidationStage {
  private readonly logger = new Logger(ValidationStage.name);

  constructor(private readonly validationService: ValidationService) {}

  execute(rawContent: string): Itinerary {
    this.logger.log('Executing Validation & Parsing Stage...');
    
    // Injects robust repair-ready validation logic
    return this.validationService.parseAndValidate<Itinerary>(
      rawContent,
      itinerarySchema,
    );
  }
}
