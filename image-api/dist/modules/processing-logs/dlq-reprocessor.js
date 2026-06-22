import cron from 'node-cron';
import { logger } from '../../lib/logger.js';
import { bulkRetryDlq } from './processing-logs.service.js';
let cronTask = null;
export function startDlqReprocessor() {
    if (cronTask)
        return;
    // Run every hour
    cronTask = cron.schedule('0 * * * *', async () => {
        logger.info('DLQ reprocessor starting...');
        try {
            const result = await bulkRetryDlq();
            if (result.updated > 0) {
                logger.info({ updated: result.updated }, 'DLQ reprocessor: retried dead letter jobs');
            }
        }
        catch (err) {
            logger.error({ err }, 'DLQ reprocessor failed');
        }
    });
    logger.info('DLQ reprocessor scheduled (every hour)');
}
export function stopDlqReprocessor() {
    if (cronTask) {
        cronTask.stop();
        cronTask = null;
        logger.info('DLQ reprocessor stopped');
    }
}
//# sourceMappingURL=dlq-reprocessor.js.map