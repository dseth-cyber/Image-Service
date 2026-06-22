import cron from 'node-cron';
import { logger } from '../../lib/logger.js';
import { runDatabaseBackup } from './backup.service.js';
let cronTask = null;
export function startBackupScheduler() {
    if (cronTask)
        return;
    // Run daily at 03:00 AM
    cronTask = cron.schedule('0 3 * * *', async () => {
        logger.info('Scheduled database backup starting...');
        const result = await runDatabaseBackup();
        logger.info({ result }, 'Scheduled database backup finished');
    });
    logger.info('Backup scheduler scheduled (daily at 03:00)');
}
export function stopBackupScheduler() {
    if (cronTask) {
        cronTask.stop();
        cronTask = null;
        logger.info('Backup scheduler stopped');
    }
}
//# sourceMappingURL=backup-scheduler.js.map