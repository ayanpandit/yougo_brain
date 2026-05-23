import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Disable default body parser if needed, but NestJS default is perfect for JSON APIs
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 8001);

  // Enable global DTO input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Register the structured Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  logger.log(`Starting YouGO Brain AI Orchestration Server on port ${port}...`);
  await app.listen(port, '0.0.0.0');
  logger.log(
    `🚀 YouGO Brain AI engine fully operational and listening at: http://localhost:${port}`,
  );
}

bootstrap().catch((err) => {
  console.error('❌ Failed to bootstrap NestJS app:', err);
  process.exit(1);
});
