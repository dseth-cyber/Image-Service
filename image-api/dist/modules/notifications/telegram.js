import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
export async function sendTelegramAlert(title, message, severity) {
    const { botToken, chatId } = config.notifications.telegram;
    if (!botToken || !chatId) {
        logger.warn('Telegram not configured — skipping notification');
        return false;
    }
    const icon = severity === 'critical' || severity === 'emergency' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
    const text = `${icon} <b>${escapeHtml(title)}</b>\n${escapeHtml(message)}`;
    try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            }),
        });
        if (!res.ok) {
            const body = await res.text();
            logger.error({ status: res.status, body }, 'Telegram send failed');
            return false;
        }
        logger.info({ chatId }, 'Telegram alert sent');
        return true;
    }
    catch (err) {
        logger.error({ err }, 'Telegram send error');
        return false;
    }
}
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
//# sourceMappingURL=telegram.js.map