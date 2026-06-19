import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { checkDatabaseConnection } from '../../lib/prisma.js';

interface HealthCheck {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: 'ok' | 'down';
    minio: 'ok' | 'down';
  };
}

async function basicHealth(_request: FastifyRequest, reply: FastifyReply) {
  const health: HealthCheck = {
    status: 'ok',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database: 'ok',
      minio: 'ok',
    },
  };

  return reply.status(200).send(health);
}

async function readinessCheck(_request: FastifyRequest, reply: FastifyReply) {
  const dbOk = await checkDatabaseConnection();

  const health: HealthCheck = {
    status: dbOk ? 'ok' : 'degraded',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database: dbOk ? 'ok' : 'down',
      minio: 'ok',
    },
  };

  const statusCode = dbOk ? 200 : 503;
  return reply.status(statusCode).send(health);
}

async function livenessCheck(_request: FastifyRequest, reply: FastifyReply) {
  return reply.status(200).send({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', basicHealth);
  app.get('/ready', readinessCheck);
  app.get('/live', livenessCheck);
}
