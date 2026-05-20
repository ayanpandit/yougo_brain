import { z } from 'zod';

export const envSchema = z
  .object({
    APP_NAME: z.string().default('yougo-brain'),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z
      .string()
      .default('8001')
      .transform((v) => parseInt(v, 10)),
    DATABASE_URL: z.string().url(),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z
      .string()
      .default('6379')
      .transform((v) => parseInt(v, 10)),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    OBSERVABILITY_ENABLED: z
      .string()
      .default('false')
      .transform((v) => v === 'true'),
    GEMINI_API_KEY: z.string().optional(),
    FALLBACK_GROQ_API_KEY: z.string().optional(),
    OPEN_ROUTE_SERVICE_KEY: z.string().optional(),
    SERPAPI_KEY: z.string().optional(),
    UNSPLASH_API_KEY: z.string().optional(),
    PEXELS_API_KEY: z.string().optional(),
  })
  .passthrough();

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error('Environment validation failed');
  }

  return result.data;
}
