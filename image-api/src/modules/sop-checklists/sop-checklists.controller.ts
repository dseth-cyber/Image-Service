import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createChecklistSchema, updateChecklistSchema, toggleStepSchema } from './sop-checklists.schema.js';
import * as sopService from './sop-checklists.service.js';
import { requirePermission } from '../../middleware/rbac.js';

async function listHandler(_request: FastifyRequest, reply: FastifyReply) {
  const checklists = await sopService.listChecklists();
  return reply.status(200).send(checklists);
}

async function getByReasonHandler(request: FastifyRequest, reply: FastifyReply) {
  const { reasonCode } = request.params as { reasonCode: string };
  const checklist = await sopService.getChecklistByReasonCode(reasonCode);
  return reply.status(200).send(checklist);
}

async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const input = createChecklistSchema.parse(request.body);
  const user = (request as any).user;
  const checklist = await sopService.createChecklist({ ...input, createdBy: user?.username });
  return reply.status(201).send(checklist);
}

async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateChecklistSchema.parse(request.body);
  const user = (request as any).user;
  const checklist = await sopService.updateChecklist(id, { ...input, updatedBy: user?.username });
  return reply.status(200).send(checklist);
}

async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await sopService.deleteChecklist(id);
  return reply.status(204).send();
}

async function getIncidentStateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { incidentId } = request.params as { incidentId: string };
  const state = await sopService.getIncidentSopState(incidentId);
  return reply.status(200).send(state);
}

async function toggleStepHandler(request: FastifyRequest, reply: FastifyReply) {
  const { incidentId } = request.params as { incidentId: string };
  const input = toggleStepSchema.parse(request.body);
  const user = (request as any).user;
  const state = await sopService.toggleStep(incidentId, input, user?.username);
  return reply.status(200).send(state);
}

export async function sopChecklistRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [app.authenticate, requirePermission('sop:read')] }, listHandler);
  app.get('/by-reason/:reasonCode', { preHandler: [app.authenticate, requirePermission('sop:read')] }, getByReasonHandler);
  app.post('/', { preHandler: [app.authenticate, requirePermission('sop:create')] }, createHandler);
  app.patch('/:id', { preHandler: [app.authenticate, requirePermission('sop:update')] }, updateHandler);
  app.delete('/:id', { preHandler: [app.authenticate, requirePermission('sop:delete')] }, deleteHandler);

  app.get('/incidents/:incidentId', { preHandler: [app.authenticate, requirePermission('cameras:read')] }, getIncidentStateHandler);
  app.patch('/incidents/:incidentId/steps', { preHandler: [app.authenticate, requirePermission('cameras:update')] }, toggleStepHandler);
}
