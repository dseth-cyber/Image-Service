import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { imageSearchSchema, registerImageSchema, updateMetadataSchema, updateTagsSchema, processingResultSchema } from './images.schema.js';
import * as imagesService from './images.service.js';
import { requirePermission } from '../../middleware/rbac.js';
import { storageRouter } from '../../lib/storage/storage-router.js';
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

async function bulkDeletePreviewHandler(request: FastifyRequest, reply: FastifyReply) {
  const { days } = request.query as { days: string };
  const d = parseInt(days, 10);
  if (!d || d < 1) return reply.status(400).send({ error: 'Invalid days parameter' });
  const result = await imagesService.bulkDeletePreview(d);
  return reply.status(200).send(result);
}

async function bulkDeleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const { days, password } = request.body as { days: number; password: string };
  const user = (request as any).user;

  // Verify password
  const authService = await import('../auth/auth.service.js');
  try {
    await authService.login({ username: user.username, password });
  } catch {
    return reply.status(401).send({ error: 'Invalid password' });
  }

  const result = await imagesService.bulkDeleteByAge(days, user.username);

  createAuditLog({
    userId: user.id,
    action: 'bulk_delete',
    entity: 'image',
    entityId: `age>${days}d`,
    description: `Bulk deleted ${result.deleted} images older than ${days} days by ${user.username}`,
    metadata: { days, deleted: result.deleted },
    ipAddress: request.ip,
  }).catch(() => {});

  return reply.status(200).send(result);
}

async function bulkReprocessAllHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await imagesService.bulkReprocessAll();
  const user = (request as any).user;
  createAuditLog({
    userId: user?.id,
    action: 'image_bulk_reprocess',
    entity: 'image',
    entityId: 'all',
    description: `Bulk reprocess queued: ${result.queued}/${result.total} images`,
    ipAddress: request.ip,
  }).catch(() => {});
  return reply.status(200).send(result);
}

async function reprocessHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await imagesService.reprocessImage(id);
  const user = (request as any).user;
  createAuditLog({
    userId: user?.id,
    action: 'image_reprocess',
    entity: 'image',
    entityId: id,
    description: `Image ${id} queued for reprocessing`,
    ipAddress: request.ip,
  }).catch(() => {});
  return reply.status(200).send(result);
}

async function trashListHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { page?: string; limit?: string };
  const result = await imagesService.listDeletedImages({
    page: query.page ? parseInt(query.page) : 1,
    limit: query.limit ? parseInt(query.limit) : 20,
  });
  return reply.send(result);
}

async function restoreHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  await imagesService.restoreImage(id);
  const user = (request as any).user;
  createAuditLog({ userId: user?.id, action: 'image_restore', entity: 'image', entityId: id, description: `Image ${id} restored from trash by ${user?.username}`, ipAddress: request.ip }).catch(() => {});
  return reply.send({ restored: true });
}

async function restoreAllHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await imagesService.restoreAllImages();
  const user = (request as any).user;
  createAuditLog({ userId: user?.id, action: 'image_restore_all', entity: 'image', entityId: 'all', description: `Restored ${result.restored} images from trash by ${user?.username}`, ipAddress: request.ip }).catch(() => {});
  return reply.send(result);
}

async function emptyTrashHandler(request: FastifyRequest, reply: FastifyReply) {
  const { password } = request.body as { password: string };
  const user = (request as any).user;
  // Verify password
  const authService = await import('../auth/auth.service.js');
  try { await authService.login({ username: user.username, password }); } catch { return reply.status(401).send({ error: 'Invalid password' }); }

  const result = await imagesService.emptyTrash();
  createAuditLog({ userId: user?.id, action: 'trash_empty', entity: 'image', entityId: 'all', description: `Permanently deleted ${result.deleted} images from trash by ${user?.username}`, ipAddress: request.ip }).catch(() => {});
  return reply.send(result);
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
    const provider = (file.storageProviderId as string)
      ? storageRouter.get(file.storageProviderId as string)
      : storageRouter.getDefault();
    const stream = await provider.getStream(file.objectKey as string);
    reply.header('Content-Type', (file.mimeType as string) ?? 'application/octet-stream');
    reply.header('Cache-Control', 'no-store');
    reply.header('Transfer-Encoding', 'chunked');
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
    '/trash',
    { preHandler: [app.authenticate, requirePermission('search:read')] },
    trashListHandler,
  );

  app.post(
    '/trash/restore-all',
    { preHandler: [app.authenticate, requirePermission('search:delete')] },
    restoreAllHandler,
  );

  app.post(
    '/trash/empty',
    { preHandler: [app.authenticate, requirePermission('search:delete')] },
    emptyTrashHandler,
  );

  app.get(
    '/bulk-delete-preview',
    { preHandler: [app.authenticate, requirePermission('search:delete')] },
    bulkDeletePreviewHandler,
  );

  app.post(
    '/bulk-delete',
    { preHandler: [app.authenticate, requirePermission('search:delete')] },
    bulkDeleteHandler,
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

  app.post(
    '/:id/restore',
    { preHandler: [app.authenticate, requirePermission('search:delete')] },
    restoreHandler,
  );

  app.post(
    '/reprocess-all',
    { preHandler: [app.authenticate, requirePermission('processing:create')] },
    bulkReprocessAllHandler,
  );

  app.post(
    '/:id/reprocess',
    { preHandler: [app.authenticate, requirePermission('processing:create')] },
    reprocessHandler,
  );

  app.get(
    '/:id/files/:fileType',
    { preHandler: [app.authenticate] },
    getFileStreamHandler,
  );
}
