import { growthQuerySchema } from './storage.schema.js';
import * as storageService from './storage.service.js';
async function summaryHandler(_request, reply) {
    const summary = await storageService.getStorageSummary();
    return reply.status(200).send(summary);
}
async function cameraStorageHandler(request, reply) {
    const { cameraId } = request.params;
    const result = await storageService.getCameraStorage(cameraId);
    return reply.status(200).send(result);
}
async function growthHandler(request, reply) {
    const { days } = growthQuerySchema.parse(request.query);
    const result = await storageService.getStorageGrowth(days);
    return reply.status(200).send(result);
}
async function forecastHandler(_request, reply) {
    const forecast = await storageService.getStorageForecast();
    return reply.status(200).send(forecast);
}
export async function storageRoutes(app) {
    app.get('/summary', { preHandler: [app.authenticate] }, summaryHandler);
    app.get('/cameras/:cameraId', { preHandler: [app.authenticate] }, cameraStorageHandler);
    app.get('/growth', { preHandler: [app.authenticate] }, growthHandler);
    app.get('/forecast', { preHandler: [app.authenticate] }, forecastHandler);
}
//# sourceMappingURL=storage.controller.js.map