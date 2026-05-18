import { HttpStatus } from '@nestjs/common';
import { BaseBrainException } from './base.exception';

export class ValidationFailureException extends BaseBrainException {
  constructor(validationDetails: string) {
    super(
      `Structured JSON schema validation failed: ${validationDetails}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'VALIDATION_FAILURE',
    );
  }
}
