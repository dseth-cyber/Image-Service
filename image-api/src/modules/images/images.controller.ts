import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { imageSearchSchema, registerImageSchema, updateMetadataSchema, updateTagsSchema, processingResultSchema } from './images.schema.js';
import * as imagesService from './images.service.js';
import { requirePermission } from '../../middleware/rbac.js';
import { getMinio } from '../../lib/minio.js';
import { config } from '../../config/index.js';
import { createAuditLog } from '../audit/audit.service.js';

async function registerImageHandler(request: FastifyRequest, reply: FastifyReply) {
  const input = registerImageSchema.parse(request.body);
  const result = await imagesService.registerImage(input);
  return reply.status(201).send(result);
}

async function searchHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = imageSearchSchema.parse(request.query);
  const result = await imagesService.searchImages(params);
  return reply.status(200).send(result);
}

async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const image = await imagesService.getImageById(id);
  return reply.status(200).send(image);
}

async function updateMetadataHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = updateMetadataSchema.parse(request.body);
  const updated = await imagesService.updateImageMetadata(id, input);
  const user = (request as any).user;
  createAuditLog({
    userId: user?.id,
    action: 'metadata_update',
    entity: 'image',
    entityId: id,
    description: `Metadata updated for image ${id}`,
    metadata: { changes: input },
    ipAddress: request.ip,
  }).catch(() => {});
  return reply.status(200).send(updated);
}

async function upsertTagsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const tags = updateTagsSchema.parse(request.body);
  const result = await imagesService.upsertImageTags(id, tags);
  const user = (request as any).user;
  createAuditLog({
    userId: user?.id,
    action: 'tags_update',
    entity: 'image',
    entityId: id,
    description: `Tags updated for image ${id}`,
    metadata: { tags },
    ipAddress: request.ip,
  }).catch(() => {});
  return reply.status(200).send(result);
}

async function deleteTagHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id, key } = request.params as { id: string; key: string };
  await imagesService.deleteImageTag(id, key);
  const user = (request as any).user;
  createAuditLog({
    userId: user?.id,
    action: 'tag_delete',
    entity: 'image',
    entityId: id,
    description: `Tag '${key}' deleted from image ${id}`,
    metadata: { key },
    ipAddress: request.ip,
  }).catch(() => {});
  return reply.status(204).send();
}

async function processingResultHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const input = processingResultSchema.parse(request.body);
  const result = await imagesService.submitProcessingResult(id, input);
  return reply.status(200).send(result);
}

async function deleteImageHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await imagesService.softDeleteImage(id);
  const user = (request as any).user;
  createAuditLog({
    userId: user?.id,
    action: 'image_delete',
    entity: 'image',
    entityId: id,
    description: `Image ${id} soft-deleted`,
    ipAddress: request.ip,
  }).catch(() => {});
  return reply.status(204).send();
}

async function getFileStreamHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id, fileType } = request.params as { id: string; fileType: string };
  const image = await imagesService.getImageById(id);

  const files = (image as Record<string, unknown>)?.imageFiles as Array<Record<string, unknown>> ?? [];
  const file = files.find((f: Record<string, unknown>) => f.fileType === fileType) as Record<string, unknown> | undefined;

  if (!file) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'NotFoundError',
      message: `File type '${fileType}' not found for image ${id}`,
    });
  }

  try {
    const minio = getMinio();
    const stream = await minio.getObject(config.minio.bucket, file.objectKey as string);
    reply.header('Content-Type', (file.mimeType as string) ?? 'application/octet-stream');
    reply.header('Content-Length', String(file.fileSizeBytes));
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    const user = (request as any).user;
    createAuditLog({
      userId: user?.id,
      action: 'file_download',
      entity: 'image_file',
      entityId: `${id}/${fileType}`,
      description: `File '${fileType}' downloaded for image ${id}`,
      ipAddress: request.ip,
    }).catch(() => {});
    return reply.send(stream);
  } catch (err) {
    return reply.status(500).send({
      statusCode: 500,
      error: 'InternalServerError',
      message: 'Failed to retrieve file from storage',
    });
  }
}

export async function imageRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/',
    { preHandler: [app.authenticate] },
    registerImageHandler,
  );

  app.get(
    '/',
    { preHandler: [app.authenticate] },
    searchHandler,
  );

  app.get(
    '/:id',
    { preHandler: [app.authenticate] },
    getByIdHandler,
  );

  app.patch(
    '/:id/metadata',
    { preHandler: [app.authenticate, requirePermission('search:update')] },
    updateMetadataHandler,
  );

  app.post(
    '/:id/tags',
    { preHandler: [app.authenticate, requirePermission('search:update')] },
    upsertTagsHandler,
  );

  app.delete(
    '/:id/tags/:key',
    { preHandler: [app.authenticate, requirePermission('search:update')] },
    deleteTagHandler,
  );

  app.post(
    '/:id/result',
    { preHandler: [app.authenticate, requirePermission('search:update')] },
    processingResultHandler,
  );

  app.delete(
    '/:id',
    { preHandler: [app.authenticate, requirePermission('search:delete')] },
    deleteImageHandler,
  );

  app.get(
    '/:id/files/:fileType',
    { preHandler: [app.authenticate] },
    getFileStreamHandler,
  );
}
