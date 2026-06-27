import type { ScheduledTask } from 'node-cron';
import cron from 'node-cron';
import { getPrisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { createAlert } from '../alerts/alerts.service.js';
import { getAllConfigs } from '../system-config/system-config.service.js';

let cronTask: ScheduledTask | null = null;

const previousStatus: Map<string, string> = new Map();

export async function checkCameraHealth(): Promise<void> {
  const prisma = getPrisma();
  const configs = await getAllConfigs();
  const offlineThresholdMin = Number(configs.camera_offline_threshold_minutes?.value ?? 5);
  const thresholdMs = offlineThresholdMin * 60 * 1000;

  const cameras = await prisma.camera.findMany({
    where: { enabled: true },
    select: { id: true, name: true, status: true, lastPolledAt: true },
  });

  for (const cam of cameras) {
    const prevStatus = previousStatus.get(cam.id);
    const timeSinceLastPoll = cam.lastPolledAt
      ? Date.now() - new Date(cam.lastPolledAt).getTime()
      : Infinity;

    const isOffline = cam.status === 'error' || cam.status === 'inactive' || timeSinceLastPoll > thresholdMs;
    const currentStatus = isOffline ? 'offline' : 'online';

    if (prevStatus === undefined) {
      previousStatus.set(cam.id, currentStatus);
      continue;
    }

    if (prevStatus === 'online' && currentStatus === 'offline') {
      logger.warn({ camera: cam.name, cameraId: cam.id, status: cam.status, lastPoll: cam.lastPolledAt }, 'Camera went offline');

      await prisma.cameraEvent.create({
        data: {
          cameraId: cam.id,
          eventType: 'offline',
          message: `Camera "${cam.name}" went offline (status: ${cam.status}, last poll: ${timeSinceLastPoll > 86400000 ? 'never' : Math.floor(timeSinceLastPoll / 1000) + 's ago'})`,
          metadata: { status: cam.status, lastPolledAt: cam.lastPolledAt, timeSinceLastPollMs: timeSinceLastPoll },
        },
      });

      const recentAlert = await prisma.alert.findFirst({
        where: {
          alertType: 'camera_offline',
          source: cam.id,
          resolvedAt: null,
          createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
        },
      });

      if (!recentAlert) {
        await createAlert({
          alertType: 'camera_offline',
          severity: 'critical',
          source: cam.id,
          title: `Camera offline: ${cam.name}`,
          message: `Camera "${cam.name}" is offline. Status: ${cam.status}. Last poll: ${cam.lastPolledAt ? new Date(cam.lastPolledAt).toISOString() : 'never'}`,
          details: { cameraId: cam.id, cameraName: cam.name, status: cam.status, lastPolledAt: cam.lastPolledAt },
        });
      }
    }

    if (prevStatus === 'offline' && currentStatus === 'online') {
      logger.info({ camera: cam.name, cameraId: cam.id }, 'Camera came back online');

      await prisma.cameraEvent.create({
        data: {
          cameraId: cam.id,
          eventType: 'online',
          message: `Camera "${cam.name}" is back online`,
          metadata: { status: cam.status },
        },
      });

      const openAlert = await prisma.alert.findFirst({
        where: {
          alertType: 'camera_offline',
          source: cam.id,
          resolvedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (openAlert) {
        const downtime = Date.now() - new Date(openAlert.createdAt).getTime();
        await prisma.alert.update({
          where: { id: openAlert.id },
          data: {
            resolvedAt: new Date(),
            resolvedBy: 'system',
            details: {
              ...(openAlert.details as any ?? {}),
              resolvedReason: 'Camera back online',
              downtimeMs: downtime,
              downtimeFormatted: formatDuration(downtime),
            },
          },
        });
        logger.info({ camera: cam.name, downtime: formatDuration(downtime) }, 'Camera offline alert resolved');
      }

      await createAlert({
        alertType: 'camera_offline',
        severity: 'info',
        source: cam.id,
        title: `Camera online: ${cam.name}`,
        message: `Camera "${cam.name}" is back online${openAlert ? '. Downtime: ' + formatDuration(Date.now() - new Date(openAlert.createdAt).getTime()) : ''}`,
        details: { cameraId: cam.id, cameraName: cam.name, event: 'back_online' },
      });
    }

    previousStatus.set(cam.id, currentStatus);
  }
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  if (hr > 0) return `${hr}h ${min % 60}m`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

export function startCameraHealthMonitor(): void {
  if (cronTask) return;

  cronTask = cron.schedule('* * * * *', async () => {
    try {
      await checkCameraHealth();
    } catch (err) {
      logger.error({ err }, 'Camera health monitor failed');
    }
  });

  logger.info('Camera health monitor scheduled (every 1 minute)');

  setTimeout(() => {
    checkCameraHealth().catch((err) => {
      logger.error({ err }, 'Initial camera health check failed');
    });
  }, 10000);
}

export function stopCameraHealthMonitor(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('Camera health monitor stopped');
  }
}
