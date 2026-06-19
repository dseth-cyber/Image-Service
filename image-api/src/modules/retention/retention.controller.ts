import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createRetentionPolicySchema, updateRetentionPolicySchema } from './retention.schema.js';
import * as retentionService from './retention.service.js';
import { requireRole } from '../../middleware/rbac.js';

async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const policies = await retentionService.listPolicies();
  return reply.status(200).send(policies);
}

async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const policy = await retentionService.getPolicyById(id);
  return reply.status(200).send(policy);
}

async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const input = createRetentionPolicySchema.parse(request.body);
  const policy = await retentionService.createPolicy(input);
  return reply.status(201).send(policy);
}

async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateRetentionPolicySchema.parse(request.body);
  const policy = await retentionService.updatePolicy(id, input);
  return reply.status(200).send(policy);
}

async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await retentionService.deletePolicy(id);
  return reply.status(204).send();
}

export async function retentionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [app.authenticate] }, listHandler);
  app.get('/:id', { preHandler: [app.authenticate] }, getByIdHandler);
  app.post('/', { preHandler: [app.authenticate, requireRole('admin')] }, createHandler);
  app.patch('/:id', { preHandler: [app.authenticate, requireRole('admin')] }, updateHandler);
  app.delete('/:id', { preHandler: [app.authenticate, requireRole('admin')] }, deleteHandler);
}
