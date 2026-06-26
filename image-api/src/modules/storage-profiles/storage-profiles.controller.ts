import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createProfileSchema, updateProfileSchema } from './storage-profiles.schema.js';
import * as profilesService from './storage-profiles.service.js';
import { requirePermission } from '../../middleware/rbac.js';

async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const profiles = await profilesService.listProfiles();
  return reply.status(200).send(profiles);
}

async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const profile = await profilesService.getProfileById(id);
  return reply.status(200).send(profile);
}

async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const input = createProfileSchema.parse(request.body);
  const profile = await profilesService.createProfile(input);
  return reply.status(201).send(profile);
}

async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateProfileSchema.parse(request.body);
  const profile = await profilesService.updateProfile(id, input);
  return reply.status(200).send(profile);
}

async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await profilesService.deleteProfile(id);
  return reply.status(200).send(result);
}

async function resolveHandler(request: FastifyRequest, reply: FastifyReply) {
  const { fileType, tagKey, tagValue, cameraId } = request.query as any;
  const result = await profilesService.resolveProfile(fileType, tagKey, tagValue, cameraId);
  return reply.status(200).send(result);
}

export async function storageProfileRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [app.authenticate, requirePermission('storage:read')] }, listHandler);
  app.get('/resolve', { preHandler: [app.authenticate, requirePermission('storage:read')] }, resolveHandler);
  app.get('/:id', { preHandler: [app.authenticate, requirePermission('storage:read')] }, getByIdHandler);
  app.post('/', { preHandler: [app.authenticate, requirePermission('storage:create')] }, createHandler);
  app.patch('/:id', { preHandler: [app.authenticate, requirePermission('storage:update')] }, updateHandler);
  app.delete('/:id', { preHandler: [app.authenticate, requirePermission('storage:delete')] }, deleteHandler);
}
