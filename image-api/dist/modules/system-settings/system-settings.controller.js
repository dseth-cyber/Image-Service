import * as settingsService from './system-settings.service.js';
const TELEGRAM_KEYS = ['telegram_bot_token', 'telegram_chat_id', 'telegram_api_base_url', 'telegram_api_token'];
async function getTelegramSettings(_request, reply) {
    const settings = await settingsService.getSettings(TELEGRAM_KEYS);
    return reply.send(settings);
}
async function updateTelegramSettings(request, reply) {
    const body = request.body;
    const allowed = ['telegram_bot_token', 'telegram_chat_id', 'telegram_api_base_url', 'telegram_api_token'];
    for (const key of allowed) {
        if (body[key] !== undefined) {
            await settingsService.setSetting(key, String(body[key]));
        }
    }
    return reply.send({ ok: true });
}
export async function systemSettingsRoutes(app) {
    app.get('/telegram', { preHandler: [app.authenticate] }, getTelegramSettings);
    app.patch('/telegram', { preHandler: [app.authenticate] }, updateTelegramSettings);
}
//# sourceMappingURL=system-settings.controller.js.map