import * as usersService from './users.service.js';
import { createUserSchema, updateUserSchema } from './users.schema.js';
import { requirePermission } from '../../middleware/rbac.js';
async function listHandler(request, reply) {
    const query = request.query;
    const result = await usersService.listUsers({
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        enabled: query.enabled === 'true' ? true : query.enabled === 'false' ? false : undefined,
    });
    return reply.send(result);
}
async function getByIdHandler(request, reply) {
    const { id } = request.params;
    const user = await usersService.getUserById(id);
    if (!user)
        return reply.status(404).send({ statusCode: 404, error: 'NotFound', message: 'User not found' });
    return reply.send(user);
}
async function createHandler(request, reply) {
    const input = createUserSchema.parse(request.body);
    const user = await usersService.createUser(input);
    return reply.status(201).send(user);
}
async function updateHandler(request, reply) {
    const { id } = request.params;
    const input = updateUserSchema.parse(request.body);
    const user = await usersService.updateUser(id, input);
    return reply.send(user);
}
async function deactivateHandler(request, reply) {
    const { id } = request.params;
    const user = await usersService.deactivateUser(id);
    return reply.send(user);
}
export async function userRoutes(app) {
    app.get('/', { preHandler: [app.authenticate, requirePermission('users:read')] }, listHandler);
    app.get('/:id', { preHandler: [app.authenticate, requirePermission('users:read')] }, getByIdHandler);
    app.post('/', { preHandler: [app.authenticate, requirePermission('users:create')] }, createHandler);
    app.patch('/:id', { preHandler: [app.authenticate, requirePermission('users:update')] }, updateHandler);
    app.delete('/:id', { preHandler: [app.authenticate, requirePermission('users:delete')] }, deactivateHandler);
}
//# sourceMappingURL=users.controller.js.map