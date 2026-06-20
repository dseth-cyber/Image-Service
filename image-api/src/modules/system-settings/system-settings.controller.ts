import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as settingsService from './system-settings.service.js';

const TELEGRAM_KEYS = ['telegram_bot_token', 'telegram_chat_id', 'telegram_api_base_url', 'telegram_api_token'];

async function getTelegramSettings(_request: FastifyRequest, reply: FastifyReply) {
  const settings = await settingsService.getSettings(TELEGRAM_KEYS);
  return reply.send(settings);
}

async function updateTelegramSettings(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as Record<string, string>;
  const allowed = ['telegram_bot_token', 'telegram_chat_id', 'telegram_api_base_url', 'telegram_api_token'];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      await settingsService.setSetting(key, String(body[key]));
    }
  }
  return reply.send({ ok: true });
}

export async function systemSettingsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/telegram', { preHandler: [app.authenticate] }, getTelegramSettings);
  app.patch('/telegram', { preHandler: [app.authenticate] }, updateTelegramSettings);
}
