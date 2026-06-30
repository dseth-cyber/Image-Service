import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  createCameraTemplateSchema,
  updateCameraTemplateSchema,
} from './camera-templates.schema.js';
import * as templatesService from './camera-templates.service.js';
import { requirePermission } from '../../middleware/rbac.js';

async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const templates = await templatesService.listCameraTemplates();
  return reply.status(200).send(templates);
}

async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const template = await templatesService.getCameraTemplateById(id);
  return reply.status(200).send(template);
}

async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const input = createCameraTemplateSchema.parse(request.body);
  const template = await templatesService.createCameraTemplate(input);
  return reply.status(201).send(template);
}

async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateCameraTemplateSchema.parse(request.body);
  const template = await templatesService.updateCameraTemplate(id, input);
  return reply.status(200).send(template);
}

async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await templatesService.deleteCameraTemplate(id);
  return reply.status(200).send(result);
}

export async function cameraTemplateRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [app.authenticate, requirePermission('cameras:read')] }, listHandler);
  app.get('/:id', { preHandler: [app.authenticate, requirePermission('cameras:read')] }, getByIdHandler);
  app.post('/', { preHandler: [app.authenticate, requirePermission('cameras:create')] }, createHandler);
  app.patch('/:id', { preHandler: [app.authenticate, requirePermission('cameras:update')] }, updateHandler);
  app.delete('/:id', { preHandler: [app.authenticate, requirePermission('cameras:delete')] }, deleteHandler);
}
