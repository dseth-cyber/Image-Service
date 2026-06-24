import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { processingLogSearchSchema } from './processing-logs.schema.js';
import * as processingLogsService from './processing-logs.service.js';
import { requirePermission } from '../../middleware/rbac.js';

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

  const statsTimer = setInterval(tick, 5_000);
  const heartbeat = setInterval(() => push('heartbeat', { ts: Date.now() }), 15_000);

  reply.raw.on('close', () => {
    clearInterval(statsTimer);
    clearInterval(heartbeat);
  });
}

export async function processingLogRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [app.authenticate] }, searchHandler);
  app.get('/stats', { preHandler: [app.authenticate] }, statsHandler);
  app.get('/trends', { preHandler: [app.authenticate] }, trendsHandler);
  app.get('/stream', streamHandler);
  app.post('/:id/retry', { preHandler: [app.authenticate, requirePermission('processing:create')] }, retryHandler);
  app.post('/:id/reject', { preHandler: [app.authenticate, requirePermission('processing:create')] }, rejectHandler);
  app.get('/dlq/summary', { preHandler: [app.authenticate] }, dlqSummaryHandler);
  app.post('/dlq/bulk-retry', { preHandler: [app.authenticate, requirePermission('dead-letter:create')] }, bulkRetryHandler);
  app.post('/dlq/bulk-reject', { preHandler: [app.authenticate, requirePermission('dead-letter:create')] }, bulkRejectHandler);
}
