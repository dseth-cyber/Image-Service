import cron from 'node-cron';
import { logger } from '../../lib/logger.js';
import { sweepExpiredImages } from './retention-sweeper.service.js';
let cronTask = null;
export function startRetentionSweeper() {
    if (cronTask)
        return;
    // Run daily at 02:00 AM
    cronTask = cron.schedule('0 2 * * *', async () => {
        logger.info('Retention sweeper starting...');
        const result = await sweepExpiredImages();
        logger.info({ result }, 'Retention sweeper finished');
    });
    logger.info('Retention sweeper scheduled (daily at 02:00)');
}
export function stopRetentionSweeper() {
    if (cronTask) {
        cronTask.stop();
        cronTask = null;
        logger.info('Retention sweeper stopped');
    }
}
export async function retentionSweeperRoutes(app) {
    // Manual trigger endpoint (admin only)
    app.post('/trigger', { preHandler: [app.authenticate] }, async (_req, reply) => {
        const result = await sweepExpiredImages();
        return reply.send(result);
    });
}
//# sourceMappingURL=retention-sweeper.controller.js.map