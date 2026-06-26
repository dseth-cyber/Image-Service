import type { ScheduledTask } from 'node-cron';
import cron from 'node-cron';
import { getPrisma } from '../../lib/prisma.js';
import { storageRouter } from '../../lib/storage/storage-router.js';
import { logger } from '../../lib/logger.js';
import { createAlert } from '../alerts/alerts.service.js';
import { getAllConfigs } from '../system-config/system-config.service.js';

let cronTask: ScheduledTask | null = null;

export async function collectMetrics(): Promise<{ provider: string; ok: boolean; latencyMs: number }[]> {
  const prisma = getPrisma();
  const providers = storageRouter.getAll();
  const results: { provider: string; ok: boolean; latencyMs: number }[] = [];

  for (const p of providers) {
    const start = Date.now();
    try {
      const health = await p.health();
      const stats = await p.stats();
      const latencyMs = Date.now() - start;

      let totalBytes = stats.totalBytes;
      let freeBytes = stats.freeBytes;
      if (totalBytes === 0) {
        const dbRecord = await prisma.storageProvider.findUnique({ where: { id: p.id }, select: { capacityBytes: true } });
        if (dbRecord?.capacityBytes) {
          totalBytes = Number(dbRecord.capacityBytes);
          freeBytes = Math.max(0, totalBytes - stats.usedBytes);
        }
      }

      await prisma.storageProviderMetric.create({
        data: {
          providerId: p.id,
          status: health.ok ? 'healthy' : 'unhealthy',
          latencyMs,
          objectCount: stats.objectCount,
          usedBytes: stats.usedBytes,
          totalBytes,
          freeBytes,
          errorMessage: health.error,
        },
      });

      if (totalBytes > 0) {
        const usagePct = (stats.usedBytes / totalBytes) * 100;
        await checkStorageAlert(p.id, p.name, usagePct, stats.usedBytes, totalBytes);
      }

      results.push({ provider: p.name, ok: health.ok, latencyMs });
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      await prisma.storageProviderMetric.create({
        data: {
          providerId: p.id,
          status: 'error',
          latencyMs,
          errorMessage: err.message,
        },
      });
      results.push({ provider: p.name, ok: false, latencyMs });
    }
  }

  return results;
}

export function startMetricCollector(): void {
  if (cronTask) return;

  cronTask = cron.schedule('*/15 * * * *', async () => {
    logger.info('Provider metric collector starting...');
    const results = await collectMetrics();
    logger.info({ results }, 'Provider metric collector finished');
  });

  logger.info('Provider metric collector scheduled (every 15 minutes)');

  setTimeout(() => {
    collectMetrics().then((results) => {
      logger.info({ results }, 'Initial metric collection done');
    }).catch((err) => {
      logger.error({ err }, 'Initial metric collection failed');
    });
  }, 5000);
}

async function checkStorageAlert(providerId: string, providerName: string, usagePct: number, usedBytes: number, totalBytes: number) {
  try {
    const configs = await getAllConfigs();
    const criticalThreshold = Number(configs.alert_critical_threshold?.value ?? 90);
    const warningThreshold = Number(configs.alert_warning_threshold?.value ?? 75);

    const prisma = getPrisma();
    const recentAlert = await prisma.alert.findFirst({
      where: {
        alertType: { in: ['storage_warning', 'disk_space'] },
        source: providerId,
        resolvedAt: null,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentAlert) return;

    const fmtBytes = (b: number) => `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;

    if (usagePct >= criticalThreshold) {
      await createAlert({
        alertType: 'disk_space',
        severity: 'critical',
        source: providerId,
        title: `Storage critical: ${providerName} (${usagePct.toFixed(1)}%)`,
        message: `${providerName} usage ${fmtBytes(usedBytes)} / ${fmtBytes(totalBytes)} (${usagePct.toFixed(1)}%) exceeds critical threshold ${criticalThreshold}%`,
        details: { providerId, providerName, usagePct, usedBytes, totalBytes },
      });
      logger.warn({ providerName, usagePct }, 'Storage critical alert created');
    } else if (usagePct >= warningThreshold) {
      await createAlert({
        alertType: 'storage_warning',
        severity: 'warning',
        source: providerId,
        title: `Storage warning: ${providerName} (${usagePct.toFixed(1)}%)`,
        message: `${providerName} usage ${fmtBytes(usedBytes)} / ${fmtBytes(totalBytes)} (${usagePct.toFixed(1)}%) exceeds warning threshold ${warningThreshold}%`,
        details: { providerId, providerName, usagePct, usedBytes, totalBytes },
      });
      logger.warn({ providerName, usagePct }, 'Storage warning alert created');
    }
  } catch (err) {
    logger.error({ err, providerName }, 'Failed to check storage alert');
  }
}

export function stopMetricCollector(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('Provider metric collector stopped');
  }
}
