import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requirePermission } from '../../middleware/rbac.js';
import * as alertRulesService from './alert-rules.service.js';

async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as Record<string, string>;
  const result = await alertRulesService.listAlertRules({
    page: query.page ? parseInt(query.page, 10) : undefined,
    limit: query.limit ? parseInt(query.limit, 10) : undefined,
  });
  return reply.send(result);
}

async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const rule = await alertRulesService.getAlertRuleById(id);
  if (!rule) return reply.status(404).send({ statusCode: 404, error: 'NotFound', message: 'Alert rule not found' });
  return reply.send(rule);
}

async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as Record<string, unknown>;
  const rule = await alertRulesService.createAlertRule({
    name: String(body.name),
    alertType: String(body.alertType) as any,
    description: body.description ? String(body.description) : undefined,
    enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
    condition: body.condition as Record<string, unknown> | undefined,
    cooldownMinutes: body.cooldownMinutes ? parseInt(String(body.cooldownMinutes), 10) : undefined,
    notificationChannels: body.notificationChannels as string[] | undefined,
  });
  return reply.status(201).send(rule);
}

async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const body = request.body as Record<string, unknown>;
  const rule = await alertRulesService.updateAlertRule(id, {
    name: body.name !== undefined ? String(body.name) : undefined,
    description: body.description !== undefined ? String(body.description) : undefined,
    enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
    condition: body.condition as Record<string, unknown> | undefined,
    cooldownMinutes: body.cooldownMinutes !== undefined ? parseInt(String(body.cooldownMinutes), 10) : undefined,
    notificationChannels: body.notificationChannels as string[] | undefined,
  });
  return reply.send(rule);
}

async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await alertRulesService.deleteAlertRule(id);
  return reply.status(204).send();
}

export async function alertRuleRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [app.authenticate, requirePermission('alerts:read')] }, listHandler);
  app.get('/:id', { preHandler: [app.authenticate, requirePermission('alerts:read')] }, getByIdHandler);
  app.post('/', { preHandler: [app.authenticate, requirePermission('alerts:create')] }, createHandler);
  app.patch('/:id', { preHandler: [app.authenticate, requirePermission('alerts:update')] }, updateHandler);
  app.delete('/:id', { preHandler: [app.authenticate, requirePermission('alerts:update')] }, deleteHandler);
}
