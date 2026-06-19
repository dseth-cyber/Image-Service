import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createCameraSchema, updateCameraSchema, cameraQuerySchema } from './cameras.schema.js';
import * as camerasService from './cameras.service.js';
import { requireRole } from '../../middleware/rbac.js';

async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const filters = cameraQuerySchema.parse(request.query);
  const cameras = await camerasService.listCameras(filters);
  return reply.status(200).send(cameras);
}

async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const camera = await camerasService.getCameraById(id);
  return reply.status(200).send(camera);
}

async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const input = createCameraSchema.parse(request.body);
  const camera = await camerasService.createCamera(input);
  return reply.status(201).send(camera);
}

async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateCameraSchema.parse(request.body);
  const camera = await camerasService.updateCamera(id, input);
  return reply.status(200).send(camera);
}

async function deactivateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await camerasService.deactivateCamera(id);
  return reply.status(204).send();
}

export async function cameraRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/',
    { preHandler: [app.authenticate] },
    listHandler,
  );
  app.get(
    '/:id',
    { preHandler: [app.authenticate] },
    getByIdHandler,
  );
  app.post(
    '/',
    { preHandler: [app.authenticate, requireRole('admin', 'operator')] },
    createHandler,
  );
  app.patch(
    '/:id',
    { preHandler: [app.authenticate, requireRole('admin', 'operator')] },
    updateHandler,
  );
  app.delete(
    '/:id',
    { preHandler: [app.authenticate, requireRole('admin')] },
    deactivateHandler,
  );
}
