import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { checkDatabaseConnection } from '../../lib/prisma.js';
import { storageRouter } from '../../lib/storage/storage-router.js';

interface HealthCheck {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: 'ok' | 'down';
    storage: 'ok' | 'degraded' | 'down';
  };
  providers: Array<{ id: string; name: string; type: string; status: 'ok' | 'down'; latencyMs: number }>;
}

async function checkStorageHealth(): Promise<{ status: 'ok' | 'degraded' | 'down'; providers: HealthCheck['providers'] }> {
  try {
    const all = storageRouter.getAll();
    if (all.length === 0) return { status: 'down', providers: [] };

    const results = await Promise.all(all.map(async (p) => {
      const h = await p.health();
      return { id: p.id, name: p.name, type: p.type, status: h.ok ? 'ok' as const : 'down' as const, latencyMs: h.latencyMs };
    }));

    const anyDown = results.some(r => r.status === 'down');
    return { status: anyDown ? 'degraded' : 'ok', providers: results };
  } catch {
    return { status: 'down', providers: [] };
  }
}

async function basicHealth(_request: FastifyRequest, reply: FastifyReply) {
  const storageHealth = await checkStorageHealth();
  const health: HealthCheck = {
    status: storageHealth.status === 'down' ? 'degraded' : 'ok',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database: 'ok',
      storage: storageHealth.status,
    },
    providers: storageHealth.providers,
  };

  return reply.status(200).send(health);
}

async function readinessCheck(_request: FastifyRequest, reply: FastifyReply) {
  const dbOk = await checkDatabaseConnection();
  const storageHealth = await checkStorageHealth();

  const health: HealthCheck = {
    status: dbOk && storageHealth.status !== 'down' ? 'ok' : 'degraded',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database: dbOk ? 'ok' : 'down',
      storage: storageHealth.status,
    },
    providers: storageHealth.providers,
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
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
