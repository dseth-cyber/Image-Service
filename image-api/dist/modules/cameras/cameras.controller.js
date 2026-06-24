import { createCameraSchema, updateCameraSchema, cameraQuerySchema } from './cameras.schema.js';
import * as camerasService from './cameras.service.js';
import { requirePermission } from '../../middleware/rbac.js';
import { getRedisClient } from '../../lib/redis.js';
async function listHandler(request, reply) {
    const filters = cameraQuerySchema.parse(request.query);
    const cameras = await camerasService.listCameras(filters);
    return reply.status(200).send(cameras);
}
async function getByIdHandler(request, reply) {
    const { id } = request.params;
    const camera = await camerasService.getCameraById(id);
    return reply.status(200).send(camera);
}
async function createHandler(request, reply) {
    const input = createCameraSchema.parse(request.body);
    const camera = await camerasService.createCamera(input);
    const redis = getRedisClient();
    await redis.set('sync:scan-now', 'all', 'EX', 60);
    return reply.status(201).send(camera);
}
async function updateHandler(request, reply) {
    const { id } = request.params;
    const input = updateCameraSchema.parse(request.body);
    const camera = await camerasService.updateCamera(id, input);
    return reply.status(200).send(camera);
}
async function deactivateHandler(request, reply) {
    const { id } = request.params;
    await camerasService.deactivateCamera(id);
    return reply.status(204).send();
}
async function scanNowHandler(_request, reply) {
    const redis = getRedisClient();
    await redis.set('sync:scan-now', 'all', 'EX', 60);
    return reply.status(200).send({ message: 'Scan triggered' });
}
async function scanCameraHandler(request, reply) {
    const { id } = request.params;
    const redis = getRedisClient();
    await redis.sadd('sync:scan-now:ids', id);
    await redis.expire('sync:scan-now:ids', 60);
    return reply.status(200).send({ message: `Scan triggered for camera ${id}` });
}
export async function cameraRoutes(app) {
    app.get('/', { preHandler: [app.authenticate] }, listHandler);
    app.post('/scan-now', { preHandler: [app.authenticate, requirePermission('cameras:update')] }, scanNowHandler);
    app.post('/:id/scan', { preHandler: [app.authenticate, requirePermission('cameras:update')] }, scanCameraHandler);
    app.get('/:id', { preHandler: [app.authenticate] }, getByIdHandler);
    app.post('/', { preHandler: [app.authenticate, requirePermission('cameras:create')] }, createHandler);
    app.patch('/:id', { preHandler: [app.authenticate, requirePermission('cameras:update')] }, updateHandler);
    app.delete('/:id', { preHandler: [app.authenticate, requirePermission('cameras:delete')] }, deactivateHandler);
}
//# sourceMappingURL=cameras.controller.js.map