import { beforeAll, vi } from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  process.env.API_BASE_URL = 'http://test-api:3001';
  process.env.API_JWT = 'test-jwt';
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
  process.env.HEALTH_PORT = '9101';
});
