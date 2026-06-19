import Redis from 'ioredis';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { Tracker } from './lib/tracker.js';
import { JobProducer } from './lib/producer.js';
import { CameraPoller } from './lib/poller.js';
import { startHealthServer, updateHealthState } from './health.js';
import * as api from './lib/api-client.js';

let shutdownRequested = false;

async function main(): Promise<void> {
  logger.info(
    { nodeEnv: config.nodeEnv, pollIntervalMs: config.polling.intervalMs },
    'Starting image-sync-worker',
  );

  const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    retryStrategy: (times) => {
      const delay = Math.min(times * 1000, 10000);
      logger.warn({ attempt: times, delay }, 'Redis reconnecting');
      return delay;
    },
    maxRetriesPerRequest: null,
  });

  redis.on('connect', () => logger.info('Connected to Redis'));
  redis.on('error', (err) => logger.error({ err }, 'Redis error'));

  const tracker = new Tracker(redis);
  const producer = new JobProducer(redis);
  const poller = new CameraPoller(tracker, producer);

  const healthServer = startHealthServer();

  process.on('SIGINT', () => handleShutdown(redis, producer, healthServer));
  process.on('SIGTERM', () => handleShutdown(redis, producer, healthServer));

  await waitForDependencies();

  updateHealthState({ status: 'ok' });
  logger.info('Worker is ready, starting poll cycle');

  while (!shutdownRequested) {
    const cycleStart = Date.now();

    try {
      const results = await poller.pollAllCameras();

      const activeCount = results.filter((r) => r.durationMs > 0).length;
      const errorCount = results.filter((r) => r.errors > 0).length;
      const totalQueued = results.reduce((s, r) => s + r.newFiles, 0);

      const queueSize = await producer.getQueueSize();

      updateHealthState({
        lastPollTime: Date.now(),
        lastPollDuration: Date.now() - cycleStart,
        camerasActive: activeCount,
        camerasWithErrors: errorCount,
        queueSize: queueSize.waiting,
      });

      logger.info(
        {
          cycleDurationMs: Date.now() - cycleStart,
          camerasChecked: results.length,
          filesQueued: totalQueued,
          errors: errorCount,
          queueWaiting: queueSize.waiting,
          queueActive: queueSize.active,
          queueFailed: queueSize.failed,
        },
        'Poll cycle finished',
      );
    } catch (err) {
      logger.error({ err, cycleDurationMs: Date.now() - cycleStart }, 'Poll cycle crashed');
      updateHealthState({ status: 'degraded' });
    }

    if (!shutdownRequested) {
      await sleep(config.polling.intervalMs);
    }
  }

  logger.info('Poll loop exited');
}

async function waitForDependencies(): Promise<void> {
  const maxRetries = 30;
  const retryDelayMs = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const apiOk = await api.checkApiHealth().catch(() => false);

    if (apiOk) {
      logger.info('All dependencies ready');
      return;
    }

    logger.warn({ attempt, maxRetries, retryDelayMs }, 'Waiting for dependencies');
    await sleep(retryDelayMs);
  }

  logger.warn('Dependencies not ready, starting anyway');
}

async function handleShutdown(
  redis: Redis,
  producer: JobProducer,
  healthServer: import('node:http').Server,
): Promise<void> {
  if (shutdownRequested) return;
  shutdownRequested = true;

  logger.info('Shutting down gracefully...');
  updateHealthState({ status: 'down' });

  try {
    await producer.close();
    await redis.quit();
    healthServer.close();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal error');
  process.exit(1);
});
