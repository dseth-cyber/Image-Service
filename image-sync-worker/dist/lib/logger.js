import pino from 'pino';
import { config } from '../config/index.js';
export const logger = pino({
    level: config.logLevel,
    name: 'image-sync-worker',
    transport: config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
    redact: {
        paths: ['password', 'smbPasswordEncrypted', 'token', 'authorization'],
        censor: '[REDACTED]',
    },
});
//# sourceMappingURL=logger.js.map