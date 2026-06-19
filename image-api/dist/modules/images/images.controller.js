import { imageSearchSchema, registerImageSchema, updateMetadataSchema, updateTagsSchema, processingResultSchema } from './images.schema.js';
import * as imagesService from './images.service.js';
import { requireRole } from '../../middleware/rbac.js';
import { getMinio } from '../../lib/minio.js';
import { config } from '../../config/index.js';
async function registerImageHandler(request, reply) {
    const input = registerImageSchema.parse(request.body);
    const result = await imagesService.registerImage(input);
    return reply.status(201).send(result);
}
async function searchHandler(request, reply) {
    const params = imageSearchSchema.parse(request.query);
    const result = await imagesService.searchImages(params);
    return reply.status(200).send(result);
}
async function getByIdHandler(request, reply) {
    const { id } = request.params;
    const image = await imagesService.getImageById(id);
    return reply.status(200).send(image);
}
async function updateMetadataHandler(request, reply) {
    const { id } = request.params;
    const input = updateMetadataSchema.parse(request.body);
    const updated = await imagesService.updateImageMetadata(id, input);
    return reply.status(200).send(updated);
}
async function upsertTagsHandler(request, reply) {
    const { id } = request.params;
    const tags = updateTagsSchema.parse(request.body);
    const result = await imagesService.upsertImageTags(id, tags);
    return reply.status(200).send(result);
}
async function deleteTagHandler(request, reply) {
    const { id, key } = request.params;
    await imagesService.deleteImageTag(id, key);
    return reply.status(204).send();
}
async function processingResultHandler(request, reply) {
    const { id } = request.params;
    const input = processingResultSchema.parse(request.body);
    const result = await imagesService.submitProcessingResult(id, input);
    return reply.status(200).send(result);
}
async function deleteImageHandler(request, reply) {
    const { id } = request.params;
    await imagesService.softDeleteImage(id);
    return reply.status(204).send();
}
async function getFileStreamHandler(request, reply) {
    const { id, fileType } = request.params;
    const image = await imagesService.getImageById(id);
    const files = image?.imageFiles ?? [];
    const file = files.find((f) => f.fileType === fileType);
    if (!file) {
        return reply.status(404).send({
            statusCode: 404,
            error: 'NotFoundError',
            message: `File type '${fileType}' not found for image ${id}`,
        });
    }
    try {
        const minio = getMinio();
        const stream = await minio.getObject(config.minio.bucket, file.objectKey);
        reply.header('Content-Type', file.mimeType ?? 'application/octet-stream');
        reply.header('Content-Length', String(file.fileSizeBytes));
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');
        return reply.send(stream);
    }
    catch (err) {
        return reply.status(500).send({
            statusCode: 500,
            error: 'InternalServerError',
            message: 'Failed to retrieve file from storage',
        });
    }
}
export async function imageRoutes(app) {
    app.post('/', { preHandler: [app.authenticate] }, registerImageHandler);
    app.get('/', { preHandler: [app.authenticate] }, searchHandler);
    app.get('/:id', { preHandler: [app.authenticate] }, getByIdHandler);
    app.patch('/:id/metadata', { preHandler: [app.authenticate, requireRole('admin', 'operator', 'system')] }, updateMetadataHandler);
    app.post('/:id/tags', { preHandler: [app.authenticate, requireRole('admin', 'operator', 'system')] }, upsertTagsHandler);
    app.delete('/:id/tags/:key', { preHandler: [app.authenticate, requireRole('admin', 'operator')] }, deleteTagHandler);
    app.post('/:id/result', { preHandler: [app.authenticate, requireRole('admin', 'operator', 'system')] }, processingResultHandler);
    app.delete('/:id', { preHandler: [app.authenticate, requireRole('admin')] }, deleteImageHandler);
    app.get('/:id/files/:fileType', { preHandler: [app.authenticate] }, getFileStreamHandler);
}
//# sourceMappingURL=images.controller.js.map