import { HttpStatus } from '@nestjs/common';
import { BaseBrainException } from './base.exception';

export class ProviderFailureException extends BaseBrainException {
  constructor(providerName: string, detailMessage: string) {
    super(
      `Third-party provider "${providerName}" failed during orchestration: ${detailMessage}`,
      HttpStatus.BAD_GATEWAY,
      'PROVIDER_FAILURE',
    );
  }
}
