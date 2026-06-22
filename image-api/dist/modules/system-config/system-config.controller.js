import * as configService from './system-config.service.js';
async function getAllHandler(_request, reply) {
    const configs = await configService.getAllConfigs();
    return reply.send(configs);
}
async function updateHandler(request, reply) {
    const body = request.body;
    await configService.updateConfigs(body);
    return reply.send({ ok: true });
}
export async function systemConfigRoutes(app) {
    app.get('/', getAllHandler);
    app.post('/bulk-update', { preHandler: [app.authenticate] }, updateHandler);
    // legacy PATCH kept for backward compatibility
    app.patch('/', { preHandler: [app.authenticate] }, updateHandler);
}
//# sourceMappingURL=system-config.controller.js.map