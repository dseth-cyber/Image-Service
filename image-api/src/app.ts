import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { authenticate } from './middleware/auth.js';
import { authRoutes } from './modules/auth/auth.controller.js';
import { imageRoutes } from './modules/images/images.controller.js';
import { cameraRoutes } from './modules/cameras/cameras.controller.js';
import { retentionRoutes } from './modules/retention/retention.controller.js';
import { healthRoutes } from './modules/health/health.controller.js';
import { storageRoutes } from './modules/storage/storage.controller.js';
import { alertRoutes } from './modules/alerts/alerts.controller.js';
import { userRoutes } from './modules/users/users.controller.js';
import { roleRoutes } from './modules/roles/roles.controller.js';
import { processingLogRoutes } from './modules/processing-logs/processing-logs.controller.js';
import { alertRuleRoutes } from './modules/alert-rules/alert-rules.controller.js';
import { systemSettingsRoutes } from './modules/system-settings/system-settings.controller.js';
import { apiKeyRoutes } from './modules/api-keys/api-keys.controller.js';
import { masterdataRoutes } from './modules/masterdata/masterdata.controller.js';
import { systemConfigRoutes } from './modules/system-config/system-config.controller.js';
import { auditRoutes } from './modules/audit/audit.controller.js';
import { backupRoutes } from './modules/backup/backup.controller.js';
import { startBackupScheduler, stopBackupScheduler } from './modules/backup/backup-scheduler.js';
import { smbRoutes } from './modules/smb/smb.controller.js';
import adminRoutes from './modules/admin/admin.controller.js';
import { startRetentionSweeper, stopRetentionSweeper } from './modules/retention-sweeper/retention-sweeper.controller.js';
import { startDlqReprocessor, stopDlqReprocessor } from './modules/processing-logs/dlq-reprocessor.js';

export async function buildApp() {
  const app = Fastify({
    logger: false,
    bodyLimit: 10 * 1024 * 1024,
  });

  app.setErrorHandler(errorHandler);

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(jwt, {
    secret: config.jwt.secret,
    sign: { expiresIn: config.jwt.accessExpiresIn },
  });

  await app.register(rateLimit, {
    max: 10000,
    timeWindow: '1 minute',
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Image Service API',
        description: 'Enterprise image management API for Smart Factory Platform',
        version: '1.0.0',
      },
      servers: [
        { url: `http://localhost:${config.port}`, description: 'Local' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list' },
  });

  app.decorate('authenticate', authenticate);

  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/api/v1/auth' });
      await api.register(imageRoutes, { prefix: '/api/v1/images' });
      await api.register(cameraRoutes, { prefix: '/api/v1/cameras' });
      await api.register(retentionRoutes, { prefix: '/api/v1/retention-policies' });
      await api.register(healthRoutes, { prefix: '/api/v1/health' });
      await api.register(storageRoutes, { prefix: '/api/v1/storage' });
      await api.register(alertRoutes, { prefix: '/api/v1/alerts' });
      await api.register(userRoutes, { prefix: '/api/v1/users' });
      await api.register(roleRoutes, { prefix: '/api/v1/roles' });
      await api.register(processingLogRoutes, { prefix: '/api/v1/processing-logs' });
      await api.register(alertRuleRoutes, { prefix: '/api/v1/alert-rules' });
      await api.register(systemSettingsRoutes, { prefix: '/api/v1/settings' });
      await api.register(apiKeyRoutes, { prefix: '/api/v1/api-keys' });
      await api.register(masterdataRoutes, { prefix: '/api/v1/masterdata' });
      await api.register(systemConfigRoutes, { prefix: '/api/v1/system-config' });
      await api.register(auditRoutes, { prefix: '/api/v1/audit-logs' });
      await api.register(backupRoutes, { prefix: '/api/v1/backup' });
      await api.register(smbRoutes, { prefix: '/api/v1' });
      await api.register(adminRoutes, { prefix: '/api/v1/admin' });
    },
  );

  app.get('/api/v1', async (_req, reply) => {
    return reply.status(200).send({
      service: 'image-api',
      version: '1.0.0',
      docs: '/docs',
    });
  });

  return app;
}

export async function startApp() {
  const app = await buildApp();

  startRetentionSweeper();
  startDlqReprocessor();
  startBackupScheduler();

  try {
    await app.listen({ host: config.host, port: config.port });
    logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
    logger.info(`Swagger docs at http://${config.host}:${config.port}/docs`);
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }

  const gracefulShutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    stopRetentionSweeper();
    stopDlqReprocessor();
    stopBackupScheduler();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  return app;
}
