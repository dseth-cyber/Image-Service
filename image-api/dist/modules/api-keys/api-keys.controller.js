import * as apiKeysService from './api-keys.service.js';
async function listHandler(request, reply) {
    const query = request.query;
    const result = await apiKeysService.listApiKeys({
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
    return reply.send(result);
}
async function getByIdHandler(request, reply) {
    const { id } = request.params;
    const key = await apiKeysService.getApiKeyById(id);
    if (!key)
        return reply.status(404).send({ statusCode: 404, error: 'NotFound', message: 'API key not found' });
    return reply.send(key);
}
async function createHandler(request, reply) {
    const body = request.body;
    const user = request.user;
    const result = await apiKeysService.createApiKey({
        name: String(body.name),
        permissions: body.permissions,
        expiresAt: body.expiresAt ? String(body.expiresAt) : undefined,
        createdBy: user?.username ?? 'system',
    });
    return reply.status(201).send(result);
}
async function updateHandler(request, reply) {
    const { id } = request.params;
    const body = request.body;
    const rule = await apiKeysService.updateApiKey(id, {
        name: body.name !== undefined ? String(body.name) : undefined,
        permissions: body.permissions,
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
        expiresAt: body.expiresAt !== undefined ? (body.expiresAt ? String(body.expiresAt) : null) : undefined,
    });
    return reply.send(rule);
}
async function deleteHandler(request, reply) {
    const { id } = request.params;
    await apiKeysService.deleteApiKey(id);
    return reply.status(204).send();
}
export async function apiKeyRoutes(app) {
    app.get('/', { preHandler: [app.authenticate] }, listHandler);
    app.get('/:id', { preHandler: [app.authenticate] }, getByIdHandler);
    app.post('/', { preHandler: [app.authenticate] }, createHandler);
    app.patch('/:id', { preHandler: [app.authenticate] }, updateHandler);
    app.delete('/:id', { preHandler: [app.authenticate] }, deleteHandler);
}
//# sourceMappingURL=api-keys.controller.js.map