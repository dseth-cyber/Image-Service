import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { processingLogSearchSchema } from './processing-logs.schema.js';
import * as processingLogsService from './processing-logs.service.js';
import { requirePermission } from '../../middleware/rbac.js';
import { createAuditLog } from '../audit/audit.service.js';
import { getRedisClient } from '../../lib/redis.js';

const QUEUE_WAIT = 'bull:image-processing:wait';
const QUEUE_ACTIVE = 'bull:image-processing:active';
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

async function searchHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = processingLogSearchSchema.parse(request.query);
  const result = await processingLogsService.searchProcessingLogs(params);
  return reply.status(200).send(result);
}

async function statsHandler(_request: FastifyRequest, reply: FastifyReply) {
  const stats = await processingLogsService.getProcessingStats();
  return reply.status(200).send(stats);
}

async function trendsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { period } = request.query as { period?: string };
  const result = await processingLogsService.getTrends(period ?? '7d');
  return reply.status(200).send(result);
}

async function retryHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await processingLogsService.retryJob(id);
  return reply.status(200).send(result);
}

async function rejectHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await processingLogsService.rejectJob(id);
  return reply.status(200).send(result);
}

async function dlqSummaryHandler(_request: FastifyRequest, reply: FastifyReply) {
  const result = await processingLogsService.getDlqSummary();
  return reply.status(200).send(result);
}

async function bulkRetryHandler(request: FastifyRequest, reply: FastifyReply) {
  const { jobType } = request.query as { jobType?: string };
  const result = await processingLogsService.bulkRetryDlq(jobType || undefined);
  return reply.status(200).send(result);
}

async function bulkRejectHandler(request: FastifyRequest, reply: FastifyReply) {
  const { jobType } = request.query as { jobType?: string };
  const result = await processingLogsService.bulkRejectDlq(jobType || undefined);
  return reply.status(200).send(result);
}

async function bulkDeletePreviewHandler(request: FastifyRequest, reply: FastifyReply) {
  const { days } = request.query as { days: string };
  const d = parseInt(days, 10);
  if (!d || d < 1) return reply.status(400).send({ error: 'Invalid days parameter' });
  const result = await processingLogsService.bulkDeleteLogsPreview(d);
  return reply.status(200).send(result);
}

async function bulkDeleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const { days, password } = request.body as { days: number; password: string };
  const user = (request as any).user;

  // Verify password
  const authService = await import('../auth/auth.service.js');
  try {
    await authService.login({ username: user.username, password });
  } catch {
    return reply.status(401).send({ error: 'Invalid password' });
  }

  const result = await processingLogsService.bulkDeleteLogsByAge(days, user.username);

  createAuditLog({
    userId: user.id,
    action: 'bulk_delete',
    entity: 'processing_log',
    entityId: `age>${days}d`,
    description: `Bulk deleted ${result.deleted} processing logs older than ${days} days by ${user.username}`,
    metadata: { days, deleted: result.deleted },
    ipAddress: request.ip,
  }).catch(() => {});

  return reply.status(200).send(result);
}

async function streamHandler(_request: FastifyRequest, reply: FastifyReply) {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  let running = true;
  const onClose = () => { running = false; };
  reply.raw.on('close', onClose);
  reply.raw.on('finish', onClose);

  const push = (event: string, data: unknown) => {
    if (!running) return;
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const tick = async () => {
    try {
      const { stats, logs } = await processingLogsService.getStreamData();
      push('stats', stats);
      push('logs', logs);
    } catch { /* next tick will retry */ }
  };

  await tick();

  const statsTimer = setInterval(tick, 2_000);
  const heartbeat = setInterval(() => push('heartbeat', { ts: Date.now() }), 15_000);

  reply.raw.on('close', () => {
    clearInterval(statsTimer);
    clearInterval(heartbeat);
  });
}

async function queueHealthHandler(_request: FastifyRequest, reply: FastifyReply) {
  const redis = getRedisClient();
  const [waiting, active] = await Promise.all([
    redis.llen(QUEUE_WAIT),
    redis.llen(QUEUE_ACTIVE),
  ]);

  // Detect stale: active > 0 but check last activity from DB
  const prisma = (await import('../../lib/prisma.js')).getPrisma();
  let stale = 0;
  let isStale = false;
  if (active > 0) {
    const threshold = new Date(Date.now() - STALE_THRESHOLD_MS);
    const recentCompleted = await prisma.processingJob.count({
      where: { status: { in: ['completed', 'failed'] }, completedAt: { gte: threshold } },
    });
    // If active jobs exist but nothing completed in last 5 min → stale
    if (recentCompleted === 0) {
      stale = active;
      isStale = true;
    }
  }

  return reply.send({ waiting, active, stale, isStale });
}

async function recoverQueueHandler(request: FastifyRequest, reply: FastifyReply) {
  const redis = getRedisClient();
  let recovered = 0;
  while (true) {
    const job = await redis.rpoplpush(QUEUE_ACTIVE, QUEUE_WAIT);
    if (!job) break;
    recovered++;
  }
  const user = (request as any).user;
  createAuditLog({
    userId: user?.id,
    action: 'queue_recover',
    entity: 'processing_queue',
    entityId: 'active',
    description: `Queue recovered: moved ${recovered} stale jobs back to wait by ${user?.username}`,
    metadata: { recovered },
    ipAddress: request.ip,
  }).catch(() => {});
  return reply.send({ recovered, message: `กู้คืน ${recovered} งานสำเร็จ` });
}

export async function processingLogRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [app.authenticate] }, searchHandler);
  app.get('/stats', { preHandler: [app.authenticate] }, statsHandler);
  app.get('/trends', { preHandler: [app.authenticate] }, trendsHandler);
  app.get('/bulk-delete-preview', { preHandler: [app.authenticate, requirePermission('processing:create')] }, bulkDeletePreviewHandler);
  app.post('/bulk-delete', { preHandler: [app.authenticate, requirePermission('processing:create')] }, bulkDeleteHandler);
  app.get('/stream', streamHandler);
  app.post('/:id/retry', { preHandler: [app.authenticate, requirePermission('processing:create')] }, retryHandler);
  app.post('/:id/reject', { preHandler: [app.authenticate, requirePermission('processing:create')] }, rejectHandler);
  app.get('/queue-health', { preHandler: [app.authenticate] }, queueHealthHandler);
  app.post('/queue-recover', { preHandler: [app.authenticate, requirePermission('processing:create')] }, recoverQueueHandler);
  app.get('/dlq/summary', { preHandler: [app.authenticate] }, dlqSummaryHandler);
  app.post('/dlq/bulk-retry', { preHandler: [app.authenticate, requirePermission('dead-letter:create')] }, bulkRetryHandler);
  app.post('/dlq/bulk-reject', { preHandler: [app.authenticate, requirePermission('dead-letter:create')] }, bulkRejectHandler);
}
