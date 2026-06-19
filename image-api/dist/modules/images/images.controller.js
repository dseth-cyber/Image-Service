import { imageSearchSchema, updateMetadataSchema, updateTagsSchema } from './images.schema.js';
import * as imagesService from './images.service.js';
import { requireRole } from '../../middleware/rbac.js';
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
async function deleteImageHandler(request, reply) {
    const { id } = request.params;
    await imagesService.softDeleteImage(id);
    return reply.status(204).send();
}
async function getFileUrlHandler(request, reply) {
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
    return reply.status(200).send({
        url: `/api/v1/images/${id}/files/${fileType}`,
        mimeType: file.mimeType,
        fileSizeBytes: file.fileSizeBytes,
    });
}
export async function imageRoutes(app) {
    app.get('/', { preHandler: [app.authenticate] }, searchHandler);
    app.get('/:id', { preHandler: [app.authenticate] }, getByIdHandler);
    app.patch('/:id/metadata', { preHandler: [app.authenticate, requireRole('admin', 'operator', 'system')] }, updateMetadataHandler);
    app.post('/:id/tags', { preHandler: [app.authenticate, requireRole('admin', 'operator', 'system')] }, upsertTagsHandler);
    app.delete('/:id/tags/:key', { preHandler: [app.authenticate, requireRole('admin', 'operator')] }, deleteTagHandler);
    app.delete('/:id', { preHandler: [app.authenticate, requireRole('admin')] }, deleteImageHandler);
    app.get('/:id/files/:fileType', { preHandler: [app.authenticate] }, getFileUrlHandler);
}
//# sourceMappingURL=images.controller.js.map