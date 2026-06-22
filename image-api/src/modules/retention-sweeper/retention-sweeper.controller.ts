import type { FastifyInstance } from 'fastify';
import type { ScheduledTask } from 'node-cron';
import cron from 'node-cron';
import { logger } from '../../lib/logger.js';
import { sweepExpiredImages } from './retention-sweeper.service.js';

let cronTask: ScheduledTask | null = null;

export function startRetentionSweeper(): void {
  if (cronTask) return;

  // Run daily at 02:00 AM
  cronTask = cron.schedule('0 2 * * *', async () => {
    logger.info('Retention sweeper starting...');
    const result = await sweepExpiredImages();
    logger.info({ result }, 'Retention sweeper finished');
  });

  logger.info('Retention sweeper scheduled (daily at 02:00)');
}

export function stopRetentionSweeper(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('Retention sweeper stopped');
  }
}

export async function retentionSweeperRoutes(app: FastifyInstance): Promise<void> {
  // Manual trigger endpoint (admin only)
  app.post('/trigger', { preHandler: [app.authenticate] }, async (_req, reply) => {
    const result = await sweepExpiredImages();
    return reply.send(result);
  });
}
