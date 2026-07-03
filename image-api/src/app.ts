import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { mkdirSync, existsSync } from 'fs';

// Ensure incident attachments directory exists on startup
const ATTACHMENT_DIR = '/app/incident-attachments';
if (!existsSync(ATTACHMENT_DIR)) {
  mkdirSync(ATTACHMENT_DIR, { recursive: true });
}

import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { authenticate } from './middleware/auth.js';
import { authRoutes } from './modules/auth/auth.controller.js';
import { imageRoutes } from './modules/images/images.controller.js';
import { cameraRoutes } from './modules/cameras/cameras.controller.js';
import { cameraTemplateRoutes } from './modules/camera-templates/camera-templates.controller.js';
import { retentionRoutes } from './modules/retention/retention.controller.js';
import { healthRoutes } from './modules/health/health.controller.js';
import { storageRoutes } from './modules/storage/storage.controller.js';
import { storageProviderRoutes } from './modules/storage-providers/storage-providers.controller.js';
import { storageProfileRoutes } from './modules/storage-profiles/storage-profiles.controller.js';
import { migrationRoutes } from './modules/migrations/migrations.controller.js';
import { alertRoutes } from './modules/alerts/alerts.controller.js';
import { knowledgeArticleRoutes } from './modules/knowledge-articles/knowledge-articles.controller.js';
import { sopChecklistRoutes } from './modules/sop-checklists/sop-checklists.controller.js';
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
import { searchRoutes } from './modules/search/search.controller.js';
import { startRetentionSweeper, stopRetentionSweeper } from './modules/retention-sweeper/retention-sweeper.controller.js';
import { startDlqReprocessor, stopDlqReprocessor } from './modules/processing-logs/dlq-reprocessor.js';
import { startMetricCollector, stopMetricCollector } from './modules/provider-metrics/provider-metric-collector.js';
import { startCameraHealthMonitor, stopCameraHealthMonitor } from './modules/cameras/camera-health-monitor.js';
import { workerUploadRoutes } from './modules/images/worker-upload.controller.js';
import { metricsRoutes } from './modules/metrics/metrics.controller.js';
import { storageRouter } from './lib/storage/storage-router.js';
import { getPrisma } from './lib/prisma.js';

export async function buildApp() {
  const app = Fastify({
    logger: false,
    bodyLimit: 10 * 1024 * 1024,
  });

  app.setErrorHandler(errorHandler);

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 1,
    },
  });

  await app.register(cors, {
    // NOTE: origin is permissive because the system runs on LAN with changing IPs.
    // In production with a fixed domain, restrict to specific origins:
    //   origin: (origin, cb) => {
    //     const allowed = ['https://your-domain.com'];
    //     if (!origin || allowed.includes(origin)) return cb(null, true);
    //     return cb(new Error('Not allowed by CORS'), false);
    //   },
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
      await api.register(cameraTemplateRoutes, { prefix: '/api/v1/camera-templates' });
      await api.register(retentionRoutes, { prefix: '/api/v1/retention-policies' });
      await api.register(healthRoutes, { prefix: '/api/v1/health' });
      await api.register(storageRoutes, { prefix: '/api/v1/storage' });
      await api.register(alertRoutes, { prefix: '/api/v1/alerts' });
      await api.register(knowledgeArticleRoutes, { prefix: '/api/v1/knowledge-articles' });
      await api.register(sopChecklistRoutes, { prefix: '/api/v1/sop-checklists' });
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
      await api.register(storageProviderRoutes, { prefix: '/api/v1/storage-providers' });
      await api.register(storageProfileRoutes, { prefix: '/api/v1/storage-profiles' });
      await api.register(migrationRoutes, { prefix: '/api/v1/migrations' });
      await api.register(workerUploadRoutes, { prefix: '/api/v1/images' });
      await api.register(metricsRoutes, { prefix: '/api/v1/metrics' });
      await api.register(searchRoutes, { prefix: '/api/v1/search' });
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
  // Security: warn about default secrets in production
  if (config.nodeEnv === 'production') {
    if (config.jwt.secret === 'change-me') {
      logger.warn('SECURITY WARNING: JWT_SECRET is using the default value. Change it in production!');
    }
    if (config.encryptionKey === 'change-me') {
      logger.warn('SECURITY WARNING: ENCRYPTION_KEY is using the default value. Change it in production!');
    }
  }

  const app = await buildApp();

  startRetentionSweeper();
  startDlqReprocessor();
  startBackupScheduler();
  startMetricCollector();
  startCameraHealthMonitor();

  try {
    const prisma = getPrisma();
    const providers = await prisma.storageProvider.findMany({ where: { deletedAt: null } });
    for (const p of providers) {
      storageRouter.register({
        id: p.id,
        name: p.name,
        type: p.type as any,
        config: p.config as any,
        isDefault: p.isDefault,
        isActive: p.isActive,
      });
    }
    logger.info({ count: storageRouter.size() }, 'Storage providers registered');

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
    stopMetricCollector();
    stopCameraHealthMonitor();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  return app;
}
