import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createCameraSchema, updateCameraSchema, cameraQuerySchema } from './cameras.schema.js';
import * as camerasService from './cameras.service.js';
import * as cameraAnalytics from './camera-analytics.service.js';
import * as incidentService from './camera-incident.service.js';
import { requirePermission } from '../../middleware/rbac.js';
import { getRedisClient } from '../../lib/redis.js';
import { createAuditLog } from '../audit/audit.service.js';
import { createAlert } from '../alerts/alerts.service.js';
import { sendWebhook } from '../../lib/webhook.js';

async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const filters = cameraQuerySchema.parse(request.query);
  const cameras = await camerasService.listCameras(filters);
  return reply.status(200).send(cameras);
}

async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const camera = await camerasService.getCameraById(id);
  return reply.status(200).send(camera);
}

async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const input = createCameraSchema.parse(request.body);
  const camera = await camerasService.createCamera(input);
  const redis = getRedisClient();
  await redis.set('sync:scan-now', 'all', 'EX', 60);
  return reply.status(201).send(camera);
}

async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const body = request.body as Record<string, any>;
  const incidentFields = {
    reason: body.reason as string | undefined,
    incidentDescription: body.incidentDescription as string | undefined,
    rootCause: body.rootCause as string | undefined,
    estimatedFinish: body.estimatedFinish as string | undefined,
    resolution: body.resolution as string | undefined,
    correctiveAction: body.correctiveAction as string | undefined,
    preventiveAction: body.preventiveAction as string | undefined,
  };
  const input = updateCameraSchema.parse(body);
  const user = (request as any).user;

  const beforeCamera = await camerasService.getCameraById(id);
  const camera = await camerasService.updateCamera(id, { ...input, _changedBy: user?.username } as any);

  if (input.status && input.status !== beforeCamera.status) {
    createAuditLog({
      userId: user?.id,
      action: 'camera_status_change',
      entity: 'camera',
      entityId: id,
      description: `Camera "${camera.name}" status changed: ${beforeCamera.status} → ${input.status} by ${user?.username ?? 'system'}`,
      metadata: { previousStatus: beforeCamera.status, newStatus: input.status },
      ipAddress: request.ip,
    }).catch(() => {});

    const statusLabels: Record<string, string> = { active: 'online', maintenance: 'maintenance', inactive: 'offline', error: 'error' };
    await createAlert({
      alertType: 'camera_offline',
      severity: input.status === 'active' ? 'info' : input.status === 'maintenance' ? 'warning' : 'critical',
      source: id,
      title: `Camera ${statusLabels[input.status] ?? input.status}: ${camera.name}`,
      message: `Camera "${camera.name}" status changed to ${input.status} by ${user?.username ?? 'system'}`,
      details: { cameraId: id, cameraName: camera.name, previousStatus: beforeCamera.status, newStatus: input.status, changedBy: user?.username },
      skipDedup: true,
    });

    sendWebhook('camera.status_changed', { cameraId: id, cameraName: camera.name, previousStatus: beforeCamera.status, newStatus: input.status, changedBy: user?.username }).catch(() => {});

    // Incident management: create or resolve incidents on status change
    if (input.status === 'active') {
      // Resolving: auto-resolve any open incident for this camera
      const openIncident = await incidentService.getOpenIncidentForCamera(id);
      if (openIncident) {
        await incidentService.resolveIncident(openIncident.id, {
          resolution: incidentFields.resolution,
          rootCause: incidentFields.rootCause,
          correctiveAction: incidentFields.correctiveAction,
          preventiveAction: incidentFields.preventiveAction,
          closedBy: user?.username ?? 'system',
        });
      }
    } else if (incidentFields.reason) {
      // Going to non-active status with a reason: create incident
      await incidentService.createIncident({
        cameraId: id,
        fromStatus: beforeCamera.status,
        toStatus: input.status,
        reason: incidentFields.reason,
        rootCause: incidentFields.rootCause,
        description: incidentFields.incidentDescription,
        estimatedFinish: incidentFields.estimatedFinish,
        openedBy: user?.username ?? 'system',
      });
    }
  } else if (Object.keys(input).length > 0) {
    createAuditLog({
      userId: user?.id,
      action: 'camera_update',
      entity: 'camera',
      entityId: id,
      description: `Camera "${camera.name}" updated by ${user?.username ?? 'system'}`,
      metadata: { changes: Object.keys(input) },
      ipAddress: request.ip,
    }).catch(() => {});
  }

  return reply.status(200).send(camera);
}

async function deleteCameraHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { password } = request.body as { password: string };
  const user = (request as any).user;

  // Verify password
  const authService = await import('../auth/auth.service.js');
  try {
    await authService.login({ username: user.username, password });
  } catch {
    return reply.status(401).send({ error: 'Invalid password' });
  }

  const camera = await camerasService.deleteCamera(id);

  createAuditLog({
    userId: user?.id,
    action: 'camera_delete',
    entity: 'camera',
    entityId: id,
    description: `Camera "${camera.name}" soft-deleted by ${user?.username ?? 'system'}`,
    metadata: { cameraName: camera.name, ipAddress: camera.ipAddress },
    ipAddress: request.ip,
  }).catch(() => {});

  await createAlert({
    alertType: 'camera_offline',
    severity: 'warning',
    source: id,
    title: `Camera deleted: ${camera.name}`,
    message: `Camera "${camera.name}" was deleted by ${user?.username ?? 'system'}`,
    details: { cameraId: id, cameraName: camera.name, deletedBy: user?.username },
    skipDedup: true,
  });

  return reply.status(200).send({ deleted: true, camera });
}

async function permanentDeleteCameraHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { password } = request.body as { password: string };
  const user = (request as any).user;

  const authService = await import('../auth/auth.service.js');
  try {
    await authService.login({ username: user.username, password });
  } catch {
    return reply.status(401).send({ error: 'Invalid password' });
  }

  const camera = await camerasService.getCameraById(id);
  await camerasService.permanentlyDeleteCamera(id);

  createAuditLog({
    userId: user?.id,
    action: 'camera_permanent_delete',
    entity: 'camera',
    entityId: id,
    description: `Camera "${camera.name}" permanently deleted by ${user?.username ?? 'system'}`,
    metadata: { cameraName: camera.name, ipAddress: camera.ipAddress },
    ipAddress: request.ip,
  }).catch(() => {});

  return reply.status(200).send({ deleted: true });
}

async function trashListHandler(_request: FastifyRequest, reply: FastifyReply) {
  const cameras = await camerasService.listDeletedCameras();
  return reply.status(200).send(cameras);
}

async function restoreCameraHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const user = (request as any).user;

  await camerasService.restoreCamera(id);

  createAuditLog({
    userId: user?.id,
    action: 'camera_restore',
    entity: 'camera',
    entityId: id,
    description: `Camera ${id} restored from trash by ${user?.username ?? 'system'}`,
    ipAddress: request.ip,
  }).catch(() => {});

  return reply.status(200).send({ restored: true });
}

async function emptyCameraTrashHandler(request: FastifyRequest, reply: FastifyReply) {
  const { password } = request.body as { password: string };
  const user = (request as any).user;

  const authService = await import('../auth/auth.service.js');
  try {
    await authService.login({ username: user.username, password });
  } catch {
    return reply.status(401).send({ error: 'Invalid password' });
  }

  const result = await camerasService.emptyCameraTrash();

  createAuditLog({
    userId: user?.id,
    action: 'camera_trash_empty',
    entity: 'camera',
    entityId: 'all',
    description: `Permanently deleted ${result.deleted} cameras from trash by ${user?.username ?? 'system'}`,
    metadata: { deleted: result.deleted },
    ipAddress: request.ip,
  }).catch(() => {});

  return reply.status(200).send(result);
}

async function analyticsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { period } = request.query as { period?: string };
  const result = await cameraAnalytics.getCameraDowntimeReport(id, period || '7d');
  return reply.send(result);
}

async function comparisonHandler(request: FastifyRequest, reply: FastifyReply) {
  const { period } = request.query as { period?: string };
  const result = await cameraAnalytics.getCameraComparisonReport(period || '7d');
  return reply.send(result);
}

async function scanNowHandler(_request: FastifyRequest, reply: FastifyReply) {
  const redis = getRedisClient();
  await redis.set('sync:scan-now', 'all', 'EX', 60);
  return reply.status(200).send({ message: 'Scan triggered' });
}

async function scanCameraHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const redis = getRedisClient();
  await redis.sadd('sync:scan-now:ids', id);
  await redis.expire('sync:scan-now:ids', 60);
  return reply.status(200).send({ message: `Scan triggered for camera ${id}` });
}

// --- Incident Handlers ---

async function listIncidentsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { cameraId, status, page, limit } = request.query as {
    cameraId?: string; status?: string; page?: string; limit?: string;
  };
  const result = await incidentService.getIncidents({
    cameraId,
    status,
    page: page ? parseInt(page) : undefined,
    limit: limit ? parseInt(limit) : undefined,
  });
  return reply.send(result);
}

async function getIncidentHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const incident = await incidentService.getIncident(id);
  if (!incident) return reply.status(404).send({ error: 'Incident not found' });
  return reply.send(incident);
}

async function resolveIncidentHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const user = (request as any).user;
  const body = request.body as Record<string, any>;
  const incident = await incidentService.resolveIncident(id, {
    resolution: body.resolution,
    rootCause: body.rootCause,
    correctiveAction: body.correctiveAction,
    preventiveAction: body.preventiveAction,
    closedBy: user?.username ?? 'system',
  });
  return reply.send(incident);
}

async function incidentOptionsHandler(_request: FastifyRequest, reply: FastifyReply) {
  const options = await incidentService.getIncidentOptions();
  return reply.send(options);
}

export async function cameraRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/',
    { preHandler: [app.authenticate] },
    listHandler,
  );
  app.get(
    '/analytics/comparison',
    { preHandler: [app.authenticate, requirePermission('cameras:read')] },
    comparisonHandler,
  );
  app.post(
    '/scan-now',
    { preHandler: [app.authenticate, requirePermission('cameras:update')] },
    scanNowHandler,
  );
  app.get(
    '/trash',
    { preHandler: [app.authenticate, requirePermission('cameras:read')] },
    trashListHandler,
  );
  app.post(
    '/trash/empty',
    { preHandler: [app.authenticate, requirePermission('cameras:delete')] },
    emptyCameraTrashHandler,
  );
  app.get(
    '/incidents',
    { preHandler: [app.authenticate, requirePermission('cameras:read')] },
    listIncidentsHandler,
  );
  app.get(
    '/incidents/options',
    { preHandler: [app.authenticate] },
    incidentOptionsHandler,
  );
  app.get(
    '/incidents/:id',
    { preHandler: [app.authenticate, requirePermission('cameras:read')] },
    getIncidentHandler,
  );
  app.post(
    '/incidents/:id/resolve',
    { preHandler: [app.authenticate, requirePermission('cameras:update')] },
    resolveIncidentHandler,
  );
  app.get(
    '/:id/analytics',
    { preHandler: [app.authenticate, requirePermission('cameras:read')] },
    analyticsHandler,
  );
  app.post(
    '/:id/scan',
    { preHandler: [app.authenticate, requirePermission('cameras:update')] },
    scanCameraHandler,
  );
  app.post(
    '/:id/restore',
    { preHandler: [app.authenticate, requirePermission('cameras:delete')] },
    restoreCameraHandler,
  );
  app.delete(
    '/:id/permanent',
    { preHandler: [app.authenticate, requirePermission('cameras:delete')] },
    permanentDeleteCameraHandler,
  );
  app.get(
    '/:id',
    { preHandler: [app.authenticate] },
    getByIdHandler,
  );
  app.post(
    '/',
    { preHandler: [app.authenticate, requirePermission('cameras:create')] },
    createHandler,
  );
  app.patch(
    '/:id',
    { preHandler: [app.authenticate, requirePermission('cameras:update')] },
    updateHandler,
  );
  app.delete(
    '/:id',
    { preHandler: [app.authenticate, requirePermission('cameras:delete')] },
    deleteCameraHandler,
  );
}
