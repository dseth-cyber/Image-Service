import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as usersService from './users.service.js';
import { createUserSchema, updateUserSchema } from './users.schema.js';
import { requirePermission } from '../../middleware/rbac.js';
import * as sessionService from '../auth/user-session.service.js';

async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as Record<string, string>;
  const result = await usersService.listUsers({
    page: query.page ? parseInt(query.page, 10) : undefined,
    limit: query.limit ? parseInt(query.limit, 10) : undefined,
    enabled: query.enabled === 'true' ? true : query.enabled === 'false' ? false : undefined,
  });
  return reply.send(result);
}

async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const user = await usersService.getUserById(id);
  if (!user) return reply.status(404).send({ statusCode: 404, error: 'NotFound', message: 'User not found' });
  return reply.send(user);
}

async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const input = createUserSchema.parse(request.body);
  const user = await usersService.createUser(input);
  return reply.status(201).send(user);
}

async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateUserSchema.parse(request.body);
  const user = await usersService.updateUser(id, input);
  return reply.send(user);
}

async function deactivateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const user = await usersService.deactivateUser(id);
  return reply.send(user);
}

async function userActivityHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const query = request.query as Record<string, string>;
  const period = query.period || '7d';
  const stats = await sessionService.getUserStats(id, period);
  return reply.send(stats);
}

async function usersActivitySummaryHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as Record<string, string>;
  const period = query.period || '7d';
  const stats = await sessionService.getAllUsersStats(period);
  return reply.send(stats);
}

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get('/activity/summary', { preHandler: [app.authenticate, requirePermission('users:read')] }, usersActivitySummaryHandler);
  app.get('/', { preHandler: [app.authenticate, requirePermission('users:read')] }, listHandler);
  app.get('/:id', { preHandler: [app.authenticate, requirePermission('users:read')] }, getByIdHandler);
  app.get('/:id/activity', { preHandler: [app.authenticate, requirePermission('users:read')] }, userActivityHandler);
  app.post('/', { preHandler: [app.authenticate, requirePermission('users:create')] }, createHandler);
  app.patch('/:id', { preHandler: [app.authenticate, requirePermission('users:update')] }, updateHandler);
  app.delete('/:id', { preHandler: [app.authenticate, requirePermission('users:delete')] }, deactivateHandler);
}
