import * as alertRulesService from './alert-rules.service.js';
async function listHandler(request, reply) {
    const query = request.query;
    const result = await alertRulesService.listAlertRules({
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
    return reply.send(result);
}
async function getByIdHandler(request, reply) {
    const { id } = request.params;
    const rule = await alertRulesService.getAlertRuleById(id);
    if (!rule)
        return reply.status(404).send({ statusCode: 404, error: 'NotFound', message: 'Alert rule not found' });
    return reply.send(rule);
}
async function createHandler(request, reply) {
    const body = request.body;
    const rule = await alertRulesService.createAlertRule({
        name: String(body.name),
        alertType: String(body.alertType),
        description: body.description ? String(body.description) : undefined,
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
        condition: body.condition,
        cooldownMinutes: body.cooldownMinutes ? parseInt(String(body.cooldownMinutes), 10) : undefined,
        notificationChannels: body.notificationChannels,
    });
    return reply.status(201).send(rule);
}
async function updateHandler(request, reply) {
    const { id } = request.params;
    const body = request.body;
    const rule = await alertRulesService.updateAlertRule(id, {
        name: body.name !== undefined ? String(body.name) : undefined,
        description: body.description !== undefined ? String(body.description) : undefined,
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
        condition: body.condition,
        cooldownMinutes: body.cooldownMinutes !== undefined ? parseInt(String(body.cooldownMinutes), 10) : undefined,
        notificationChannels: body.notificationChannels,
    });
    return reply.send(rule);
}
async function deleteHandler(request, reply) {
    const { id } = request.params;
    await alertRulesService.deleteAlertRule(id);
    return reply.status(204).send();
}
export async function alertRuleRoutes(app) {
    app.get('/', { preHandler: [app.authenticate] }, listHandler);
    app.get('/:id', { preHandler: [app.authenticate] }, getByIdHandler);
    app.post('/', { preHandler: [app.authenticate] }, createHandler);
    app.patch('/:id', { preHandler: [app.authenticate] }, updateHandler);
    app.delete('/:id', { preHandler: [app.authenticate] }, deleteHandler);
}
//# sourceMappingURL=alert-rules.controller.js.map