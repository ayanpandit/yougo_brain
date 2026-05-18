import { registerAs } from '@nestjs/config';
import { EnvConfig } from './env.validation';

export interface AppConfig {
  name: string;
  env: string;
  port: number;
  databaseUrl: string;
  redis: {
    host: string;
    port: number;
  };
  logLevel: string;
  observabilityEnabled: boolean;
}

export default registerAs('app', (): AppConfig => {
  return {
    name: process.env.APP_NAME || 'yougo-brain',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '8001', 10),
    databaseUrl: process.env.DATABASE_URL || '',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    logLevel: process.env.LOG_LEVEL || 'info',
    observabilityEnabled: process.env.OBSERVABILITY_ENABLED === 'true',
  };
});
