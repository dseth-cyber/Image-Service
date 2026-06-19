import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as alertsService from './alerts.service.js';

async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as Record<string, unknown>;
  const alert = await alertsService.createAlert({
    alertType: String(body.alertType) as any,
    severity: (body.severity as any) ?? 'warning',
    source: body.source ? String(body.source) : undefined,
    title: String(body.title),
    message: String(body.message),
    details: body.details as Record<string, unknown> | undefined,
  });
  return reply.status(201).send(alert);
}

export async function alertRoutes(app: FastifyInstance): Promise<void> {
  app.post('/', { preHandler: [app.authenticate] }, createHandler);
}
