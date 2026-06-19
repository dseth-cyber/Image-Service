import { createRetentionPolicySchema, updateRetentionPolicySchema } from './retention.schema.js';
import * as retentionService from './retention.service.js';
import { requireRole } from '../../middleware/rbac.js';
async function listHandler(_request, reply) {
    const policies = await retentionService.listPolicies();
    return reply.status(200).send(policies);
}
async function getByIdHandler(request, reply) {
    const { id } = request.params;
    const policy = await retentionService.getPolicyById(id);
    return reply.status(200).send(policy);
}
async function createHandler(request, reply) {
    const input = createRetentionPolicySchema.parse(request.body);
    const policy = await retentionService.createPolicy(input);
    return reply.status(201).send(policy);
}
async function updateHandler(request, reply) {
    const { id } = request.params;
    const input = updateRetentionPolicySchema.parse(request.body);
    const policy = await retentionService.updatePolicy(id, input);
    return reply.status(200).send(policy);
}
async function deleteHandler(request, reply) {
    const { id } = request.params;
    await retentionService.deletePolicy(id);
    return reply.status(204).send();
}
export async function retentionRoutes(app) {
    app.get('/', { preHandler: [app.authenticate] }, listHandler);
    app.get('/:id', { preHandler: [app.authenticate] }, getByIdHandler);
    app.post('/', { preHandler: [app.authenticate, requireRole('admin')] }, createHandler);
    app.patch('/:id', { preHandler: [app.authenticate, requireRole('admin')] }, updateHandler);
    app.delete('/:id', { preHandler: [app.authenticate, requireRole('admin')] }, deleteHandler);
}
//# sourceMappingURL=retention.controller.js.map