import { requirePermission } from '../../middleware/rbac.js';
import * as backupService from './backup.service.js';
async function getStatusHandler(_request, reply) {
    const status = await backupService.getBackupStatus();
    return reply.status(200).send(status);
}
async function listHandler(request, reply) {
    const query = request.query;
    const result = await backupService.listBackupRecords({
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 50,
        type: query.type,
    });
    return reply.status(200).send(result);
}
async function runDbBackupHandler(_request, reply) {
    const result = await backupService.runDatabaseBackup();
    return reply.status(result.status === 'failed' ? 500 : 200).send(result);
}
async function runMinioBackupHandler(_request, reply) {
    const result = await backupService.runMinioBackup();
    return reply.status(result.status === 'failed' ? 500 : 200).send(result);
}
async function restoreTestHandler(request, reply) {
    const { id } = request.params;
    const result = await backupService.runRestoreTest(id);
    return reply.status(200).send(result);
}
export async function backupRoutes(app) {
    app.get('/status', { preHandler: [app.authenticate] }, getStatusHandler);
    app.get('/', { preHandler: [app.authenticate] }, listHandler);
    app.post('/run/database', { preHandler: [app.authenticate, requirePermission('backup:create')] }, runDbBackupHandler);
    app.post('/run/minio', { preHandler: [app.authenticate, requirePermission('backup:create')] }, runMinioBackupHandler);
    app.post('/:id/restore-test', { preHandler: [app.authenticate, requirePermission('backup:create')] }, restoreTestHandler);
}
//# sourceMappingURL=backup.controller.js.map