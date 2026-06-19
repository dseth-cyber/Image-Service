export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  logLevel: process.env.LOG_LEVEL ?? 'info',

  api: {
    baseUrl: process.env.API_BASE_URL ?? 'http://image-api:3001',
    jwt: process.env.API_JWT ?? '',
    serviceApiKey: process.env.SERVICE_API_KEY ?? '',
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'redis',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  polling: {
    intervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? '30000', 10),
    concurrency: parseInt(process.env.POLL_CONCURRENCY ?? '5', 10),
  },

  checksum: {
    algorithm: (process.env.CHECKSUM_ALGORITHM ?? 'sha256') as 'md5' | 'sha256',
  },

  scanner: {
    maxDepth: parseInt(process.env.SCANNER_MAX_DEPTH ?? '50', 10),
  },

  tracker: {
    processedTtlDays: parseInt(process.env.PROCESSED_TTL_DAYS ?? '7', 10),
  },

  retry: {
    maxRetries: parseInt(process.env.RETRY_MAX_RETRIES ?? '3', 10),
    initialDelayMs: parseInt(process.env.RETRY_INITIAL_DELAY_MS ?? '1000', 10),
    maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS ?? '30000', 10),
  },

  health: {
    port: parseInt(process.env.HEALTH_PORT ?? '9100', 10),
  },
} as const;
