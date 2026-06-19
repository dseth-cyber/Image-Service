import * as alertsService from './alerts.service.js';
async function createHandler(request, reply) {
    const body = request.body;
    const alert = await alertsService.createAlert({
        alertType: String(body.alertType),
        severity: body.severity ?? 'warning',
        source: body.source ? String(body.source) : undefined,
        title: String(body.title),
        message: String(body.message),
        details: body.details,
    });
    return reply.status(201).send(alert);
}
async function listHandler(request, reply) {
    const query = request.query;
    const result = await alertsService.listAlerts({
        severity: query.severity,
        resolved: query.resolved === 'true' ? true : query.resolved === 'false' ? false : undefined,
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
    return reply.send(result);
}
async function getByIdHandler(request, reply) {
    const { id } = request.params;
    const alert = await alertsService.getAlertById(id);
    if (!alert)
        return reply.status(404).send({ statusCode: 404, error: 'NotFound', message: 'Alert not found' });
    return reply.send(alert);
}
async function acknowledgeHandler(request, reply) {
    const { id } = request.params;
    const user = request.user;
    const alert = await alertsService.acknowledgeAlert(id, user?.username ?? 'system');
    return reply.send(alert);
}
async function resolveHandler(request, reply) {
    const { id } = request.params;
    const user = request.user;
    const alert = await alertsService.resolveAlert(id, user?.username ?? 'system');
    return reply.send(alert);
}
export async function alertRoutes(app) {
    app.post('/', { preHandler: [app.authenticate] }, createHandler);
    app.get('/', { preHandler: [app.authenticate] }, listHandler);
    app.get('/:id', { preHandler: [app.authenticate] }, getByIdHandler);
    app.patch('/:id/acknowledge', { preHandler: [app.authenticate] }, acknowledgeHandler);
    app.patch('/:id/resolve', { preHandler: [app.authenticate] }, resolveHandler);
}
//# sourceMappingURL=alerts.controller.js.map