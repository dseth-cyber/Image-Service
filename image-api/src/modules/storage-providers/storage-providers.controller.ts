import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createProviderSchema, updateProviderSchema } from './storage-providers.schema.js';
import * as providersService from './storage-providers.service.js';
import { requirePermission } from '../../middleware/rbac.js';

async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const providers = await providersService.listProviders();
  return reply.status(200).send(providers);
}

async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const provider = await providersService.getProviderById(id);
  return reply.status(200).send(provider);
}

async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const input = createProviderSchema.parse(request.body);
  const provider = await providersService.createProvider(input);
  return reply.status(201).send(provider);
}

async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateProviderSchema.parse(request.body);
  const provider = await providersService.updateProvider(id, input);
  return reply.status(200).send(provider);
}

async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await providersService.deleteProvider(id);
  return reply.status(204).send();
}

async function testHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await providersService.testProvider(id);
  return reply.status(200).send(result);
}

async function getDefaultHandler(_request: FastifyRequest, reply: FastifyReply) {
  const providers = await providersService.listProviders();
  const defaultProvider = providers.find((p: any) => p.isDefault) ?? providers[0] ?? null;
  if (!defaultProvider) {
    return reply.status(404).send({ error: 'No storage provider configured' });
  }
  return reply.status(200).send(defaultProvider);
}

async function metricsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const metrics = await providersService.getProviderMetrics(id);
  return reply.status(200).send(metrics);
}

export async function storageProviderRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [app.authenticate, requirePermission('storage:read')] }, listHandler);
  app.get('/default', { preHandler: [app.authenticate] }, getDefaultHandler);
  app.get('/:id', { preHandler: [app.authenticate, requirePermission('storage:read')] }, getByIdHandler);
  app.post('/', { preHandler: [app.authenticate, requirePermission('storage:create')] }, createHandler);
  app.patch('/:id', { preHandler: [app.authenticate, requirePermission('storage:update')] }, updateHandler);
  app.delete('/:id', { preHandler: [app.authenticate, requirePermission('storage:delete')] }, deleteHandler);
  app.post('/:id/test', { preHandler: [app.authenticate, requirePermission('storage:read')] }, testHandler);
  app.get('/:id/metrics', { preHandler: [app.authenticate, requirePermission('storage:read')] }, metricsHandler);
}
