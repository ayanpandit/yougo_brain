import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred in the travel AI engine';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resPayload: any = exception.getResponse();
      
      if (typeof resPayload === 'object' && resPayload !== null) {
        code = resPayload.code || 'HTTP_EXCEPTION';
        message = resPayload.message || message;
        details = resPayload.details;
      } else {
        message = String(resPayload);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      code = 'RUNTIME_ERROR';
      
      // Print full stack trace for observability
      this.logger.error(`Critical runtime crash caught: ${exception.message}`, exception.stack);
    } else {
      this.logger.error('Unknown raw error object caught:', exception);
    }

    // Don't leak details in production mode
    const isProd = process.env.NODE_ENV === 'production';
    
    response.status(status).json({
      status: 'error',
      code,
      message,
      timestamp: new Date().toISOString(),
      ...(isProd ? {} : { details, stack: exception instanceof Error ? exception.stack : undefined }),
    });
  }
}
