import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { searchAuditLogs } from './audit.service.js';

async function searchHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = request.query as Record<string, any>;
  const result = await searchAuditLogs({
    page: params.page ? parseInt(params.page) : 1,
    limit: params.limit ? parseInt(params.limit) : 50,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    userId: params.userId,
    from: params.from,
    to: params.to,
  });
  return reply.status(200).send(result);
}

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [app.authenticate] }, searchHandler);
}
