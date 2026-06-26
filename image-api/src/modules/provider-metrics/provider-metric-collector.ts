import type { ScheduledTask } from 'node-cron';
import cron from 'node-cron';
import { getPrisma } from '../../lib/prisma.js';
import { storageRouter } from '../../lib/storage/storage-router.js';
import { logger } from '../../lib/logger.js';

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

      await prisma.storageProviderMetric.create({
        data: {
          providerId: p.id,
          status: health.ok ? 'healthy' : 'unhealthy',
          latencyMs,
          objectCount: stats.objectCount,
          usedBytes: stats.usedBytes,
          errorMessage: health.error,
        },
      });

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

  collectMetrics().catch((err) => {
    logger.error({ err }, 'Initial metric collection failed');
  });
}

export function stopMetricCollector(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('Provider metric collector stopped');
  }
}
