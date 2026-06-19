import { Queue, QueueEvents } from 'bullmq';
import type Redis from 'ioredis';
import { logger } from './logger.js';
import { config } from '../config/index.js';
import type { ProcessingJobPayload } from '../types/index.js';

const QUEUE_NAME = 'image-processing';

export class JobProducer {
  private queue: Queue;
  private events: QueueEvents;

  constructor(redis: Redis) {
    this.queue = new Queue(QUEUE_NAME, {
      connection: redis as never,
      defaultJobOptions: {
        attempts: config.retry.maxRetries,
        backoff: {
          type: 'exponential',
          delay: config.retry.initialDelayMs,
        },
        removeOnComplete: {
          age: 86400 * 7,
          count: 10000,
        },
        removeOnFail: {
          age: 86400 * 30,
        },
      },
    });

    this.events = new QueueEvents(QUEUE_NAME, { connection: redis as never });
  }

  async enqueue(
    payload: ProcessingJobPayload,
    priority: number = 0,
  ): Promise<string> {
    const job = await this.queue.add(
      'process-image',
      payload,
      {
        priority,
        jobId: `img-${payload.imageId}`,
        deduplication: {
          id: payload.checksumMd5,
          ttl: 300000,
        },
      },
    );

    logger.info(
      {
        jobId: job.id,
        imageId: payload.imageId,
        cameraId: payload.cameraId,
        filename: payload.originalFilename,
      },
      'Processing job enqueued',
    );

    return job.id ?? '';
  }

  async enqueueBatch(
    items: ProcessingJobPayload[],
    priority: number = 0,
  ): Promise<string[]> {
    const jobs = items.map((payload) => ({
      name: 'process-image',
      data: payload,
      opts: {
        priority,
        jobId: `img-${payload.imageId}`,
        deduplication: {
          id: payload.checksumMd5,
          ttl: 300000,
        },
      },
    }));

    const added = await this.queue.addBulk(jobs);

    logger.info({ count: added.length }, 'Batch jobs enqueued');

    return added.map((j) => j.id ?? '');
  }

  async getQueueSize(): Promise<{ waiting: number; active: number; failed: number }> {
    const [waiting, active, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getFailedCount(),
    ]);
    return { waiting, active, failed };
  }

  async close(): Promise<void> {
    await this.events.close();
    await this.queue.close();
  }
}
