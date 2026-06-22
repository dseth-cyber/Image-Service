import { createRoleSchema, updateRoleSchema } from './roles.schema.js';
import * as rolesService from './roles.service.js';
import { requirePermission } from '../../middleware/rbac.js';
import { createAuditLog } from '../audit/audit.service.js';
async function listHandler(_request, reply) {
    const roles = await rolesService.listRoles();
    return reply.status(200).send(roles);
}
async function getByIdHandler(request, reply) {
    const { id } = request.params;
    const role = await rolesService.getRoleById(id);
    return reply.status(200).send(role);
}
async function createHandler(request, reply) {
    const input = createRoleSchema.parse(request.body);
    const role = await rolesService.createRole(input);
    const user = request.user;
    createAuditLog({
        userId: user?.id,
        action: 'role_create',
        entity: 'custom_role',
        entityId: role.id,
        description: `Role '${input.code}' created`,
        metadata: { code: input.code },
        ipAddress: request.ip,
    }).catch(() => { });
    return reply.status(201).send(role);
}
async function updateHandler(request, reply) {
    const { id } = request.params;
    const input = updateRoleSchema.parse(request.body);
    const role = await rolesService.updateRole(id, input);
    const user = request.user;
    createAuditLog({
        userId: user?.id,
        action: 'role_update',
        entity: 'custom_role',
        entityId: id,
        description: `Role ${role.code} updated`,
        ipAddress: request.ip,
    }).catch(() => { });
    return reply.status(200).send(role);
}
async function deleteHandler(request, reply) {
    const { id } = request.params;
    await rolesService.deleteRole(id);
    const user = request.user;
    createAuditLog({
        userId: user?.id,
        action: 'role_delete',
        entity: 'custom_role',
        entityId: id,
        description: `Role ${id} deleted`,
        ipAddress: request.ip,
    }).catch(() => { });
    return reply.status(204).send();
}
export async function roleRoutes(app) {
    app.get('/', { preHandler: [app.authenticate, requirePermission('users:read')] }, listHandler);
    app.get('/:id', { preHandler: [app.authenticate, requirePermission('users:read')] }, getByIdHandler);
    app.post('/', { preHandler: [app.authenticate, requirePermission('users:create')] }, createHandler);
    app.patch('/:id', { preHandler: [app.authenticate, requirePermission('users:update')] }, updateHandler);
    app.delete('/:id', { preHandler: [app.authenticate, requirePermission('users:delete')] }, deleteHandler);
}
//# sourceMappingURL=roles.controller.js.map