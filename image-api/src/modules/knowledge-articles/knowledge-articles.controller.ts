import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createArticleSchema, updateArticleSchema } from './knowledge-articles.schema.js';
import * as articlesService from './knowledge-articles.service.js';
import { requirePermission } from '../../middleware/rbac.js';

async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as Record<string, string>;
  const result = await articlesService.listArticles({
    q: query.q,
    tag: query.tag,
    reasonCode: query.reasonCode,
    rootCauseCode: query.rootCauseCode,
    page: query.page ? parseInt(query.page, 10) : undefined,
    limit: query.limit ? parseInt(query.limit, 10) : undefined,
  });
  return reply.status(200).send(result);
}

async function relatedHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as Record<string, string>;
  const result = await articlesService.getRelatedArticles({ reasonCode: query.reasonCode, rootCauseCode: query.rootCauseCode });
  return reply.status(200).send(result);
}

async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const article = await articlesService.getArticleById(id);
  return reply.status(200).send(article);
}

async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const input = createArticleSchema.parse(request.body);
  const user = (request as any).user;
  const article = await articlesService.createArticle({ ...input, createdBy: user?.username });
  return reply.status(201).send(article);
}

async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateArticleSchema.parse(request.body);
  const user = (request as any).user;
  const article = await articlesService.updateArticle(id, { ...input, updatedBy: user?.username });
  return reply.status(200).send(article);
}

async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await articlesService.deleteArticle(id);
  return reply.status(204).send();
}

export async function knowledgeArticleRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [app.authenticate, requirePermission('knowledge:read')] }, listHandler);
  app.get('/related', { preHandler: [app.authenticate, requirePermission('knowledge:read')] }, relatedHandler);
  app.get('/:id', { preHandler: [app.authenticate, requirePermission('knowledge:read')] }, getByIdHandler);
  app.post('/', { preHandler: [app.authenticate, requirePermission('knowledge:create')] }, createHandler);
  app.patch('/:id', { preHandler: [app.authenticate, requirePermission('knowledge:update')] }, updateHandler);
  app.delete('/:id', { preHandler: [app.authenticate, requirePermission('knowledge:delete')] }, deleteHandler);
}
