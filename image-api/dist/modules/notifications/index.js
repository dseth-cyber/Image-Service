import { logger } from '../../lib/logger.js';
import { sendTelegramAlert } from './telegram.js';
import { sendLineAlert } from './line.js';
const cooldownMap = new Map();
function isOnCooldown(ruleId, cooldownMinutes) {
    if (cooldownMinutes <= 0)
        return false;
    const lastSent = cooldownMap.get(ruleId);
    if (!lastSent)
        return false;
    const elapsed = (Date.now() - lastSent) / 1000 / 60;
    return elapsed < cooldownMinutes;
}
export async function notifyChannels(opts) {
    const { title, message, severity, channels, ruleId, cooldownMinutes } = opts;
    if (ruleId && cooldownMinutes && isOnCooldown(ruleId, cooldownMinutes)) {
        logger.info({ ruleId }, 'Notification skipped — within cooldown window');
        return;
    }
    const results = await Promise.allSettled(channels.map(async (ch) => {
        switch (ch) {
            case 'telegram':
                return sendTelegramAlert(title, message, severity);
            case 'line':
                return sendLineAlert(title, message, severity);
            default:
                logger.warn({ channel: ch }, 'Unknown notification channel');
                return false;
        }
    }));
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            logger.error({ channel: channels[i], err: r.reason }, 'Notification channel failed');
        }
    });
    if (ruleId && results.some((r) => r.status === 'fulfilled' && r.value)) {
        cooldownMap.set(ruleId, Date.now());
    }
}
//# sourceMappingURL=index.js.map