import { HttpException, HttpStatus } from '@nestjs/common';

export abstract class BaseBrainException extends HttpException {
  constructor(message: string, status: HttpStatus, public readonly code: string) {
    super(
      {
        status: 'error',
        code,
        message,
      },
      status,
    );
  }
}
