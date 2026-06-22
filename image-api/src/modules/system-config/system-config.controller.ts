import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as configService from './system-config.service.js';

async function getAllHandler(_request: FastifyRequest, reply: FastifyReply) {
  const configs = await configService.getAllConfigs();
  return reply.send(configs);
}

async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as Record<string, string>;
  await configService.updateConfigs(body);
  return reply.send({ ok: true });
}

export async function systemConfigRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', getAllHandler);
  app.post('/bulk-update', { preHandler: [app.authenticate] }, updateHandler);
  // legacy PATCH kept for backward compatibility
  app.patch('/', { preHandler: [app.authenticate] }, updateHandler);
}
