import { searchAuditLogs } from './audit.service.js';
async function searchHandler(request, reply) {
    const params = request.query;
    const result = await searchAuditLogs({
        page: params.page ? parseInt(params.page) : 1,
        limit: params.limit ? parseInt(params.limit) : 50,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        userId: params.userId,
        from: params.from,
        to: params.to,
    });
    return reply.status(200).send(result);
}
export async function auditRoutes(app) {
    app.get('/', { preHandler: [app.authenticate] }, searchHandler);
}
//# sourceMappingURL=audit.controller.js.map