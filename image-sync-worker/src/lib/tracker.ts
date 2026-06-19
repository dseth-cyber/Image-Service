import Redis from 'ioredis';
import { logger } from './logger.js';
import { config } from '../config/index.js';

function processedKey(cameraId: string, checksum: string): string {
  return `sync:processed:${cameraId}:${checksum}`;
}

function cameraProcessedSetKey(cameraId: string): string {
  return `sync:camera:${cameraId}:checksums`;
}

function watermarkKey(cameraId: string): string {
  return `sync:camera:${cameraId}:watermark`;
}

function cameraStateKey(cameraId: string): string {
  return `sync:camera:${cameraId}:state`;
}

function checksumPathKey(cameraId: string, checksum: string): string {
  return `sync:camera:${cameraId}:path:${checksum}`;
}

export interface CameraState {
  lastPolledAt: string;
  lastScanDuration: number;
  status: 'ok' | 'error';
  lastError: string;
  scanned: number;
  newFiles: number;
  duplicates: number;
  errors: number;
}

export interface FileMoveEvent {
  cameraId: string;
  checksum: string;
  previousPath: string;
  newPath: string;
}

export class Tracker {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /* ─── Watermark ─── */

  async getWatermark(cameraId: string): Promise<number | null> {
    const key = watermarkKey(cameraId);
    const val = await this.redis.get(key);
    return val ? parseInt(val, 10) : null;
  }

  async setWatermark(cameraId: string, timestamp: number): Promise<void> {
    const key = watermarkKey(cameraId);
    await this.redis.set(key, timestamp.toString());
    logger.debug({ cameraId, timestamp }, 'Watermark updated');
  }

  async clearWatermark(cameraId: string): Promise<void> {
    await this.redis.del(watermarkKey(cameraId));
  }

  /* ─── Camera State ─── */

  async getCameraState(cameraId: string): Promise<CameraState | null> {
    const key = cameraStateKey(cameraId);
    const raw = await this.redis.hgetall(key);
    if (!raw || Object.keys(raw).length === 0) return null;
    return {
      lastPolledAt: raw.lastPolledAt ?? '',
      lastScanDuration: parseInt(raw.lastScanDuration ?? '0', 10),
      status: (raw.status as 'ok' | 'error') ?? 'ok',
      lastError: raw.lastError ?? '',
      scanned: parseInt(raw.scanned ?? '0', 10),
      newFiles: parseInt(raw.newFiles ?? '0', 10),
      duplicates: parseInt(raw.duplicates ?? '0', 10),
      errors: parseInt(raw.errors ?? '0', 10),
    };
  }

  async setCameraState(cameraId: string, state: Partial<CameraState>): Promise<void> {
    const key = cameraStateKey(cameraId);
    const entries = Object.entries(state).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return;
    const record = Object.fromEntries(entries) as Record<string, string>;
    await this.redis.hset(key, record);
    await this.redis.expire(key, config.tracker.processedTtlDays * 86400);
  }

  /* ─── File Move Detection ─── */

  async getChecksumPath(cameraId: string, checksum: string): Promise<string | null> {
    const key = checksumPathKey(cameraId, checksum);
    const ttl = await this.redis.ttl(key);
    if (ttl <= 0) return null;
    return this.redis.get(key);
  }

  async setChecksumPath(
    cameraId: string,
    checksum: string,
    path: string,
  ): Promise<FileMoveEvent | null> {
    const key = checksumPathKey(cameraId, checksum);
    const previousPath = await this.redis.getset(key, path);
    const ttlSeconds = config.tracker.processedTtlDays * 86400;
    await this.redis.expire(key, ttlSeconds);

    if (previousPath && previousPath !== path) {
      logger.warn(
        { cameraId, checksum: checksum.slice(0, 16), previousPath, newPath: path },
        'File move detected',
      );
      return { cameraId, checksum, previousPath, newPath: path };
    }
    return null;
  }

  /* ─── Processed Tracking (existing) ─── */

  async isProcessed(cameraId: string, checksum: string): Promise<boolean> {
    const key = processedKey(cameraId, checksum);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async markProcessed(
    cameraId: string,
    checksum: string,
    imageId?: string,
  ): Promise<void> {
    const key = processedKey(cameraId, checksum);
    const ttlSeconds = config.tracker.processedTtlDays * 86400;

    await this.redis.setex(key, ttlSeconds, imageId ?? '1');

    const setKey = cameraProcessedSetKey(cameraId);
    await this.redis.sadd(setKey, checksum);
    await this.redis.expire(setKey, ttlSeconds);

    logger.debug({ cameraId, checksum: checksum.slice(0, 16) }, 'Marked as processed');
  }

  async markBatchProcessed(
    items: Array<{ cameraId: string; checksum: string; imageId?: string }>,
  ): Promise<void> {
    const pipeline = this.redis.pipeline();
    const ttlSeconds = config.tracker.processedTtlDays * 86400;

    for (const item of items) {
      const key = processedKey(item.cameraId, item.checksum);
      pipeline.setex(key, ttlSeconds, item.imageId ?? '1');

      const setKey = cameraProcessedSetKey(item.cameraId);
      pipeline.sadd(setKey, item.checksum);
      pipeline.expire(setKey, ttlSeconds);
    }

    await pipeline.exec();
    logger.info({ count: items.length }, 'Batch processed marks completed');
  }

  async getProcessedCount(cameraId: string): Promise<number> {
    const setKey = cameraProcessedSetKey(cameraId);
    return this.redis.scard(setKey);
  }

  async clearProcessed(cameraId: string): Promise<void> {
    const setKey = cameraProcessedSetKey(cameraId);
    const members = await this.redis.smembers(setKey);

    if (members.length > 0) {
      const pipeline = this.redis.pipeline();
      for (const checksum of members) {
        pipeline.del(processedKey(cameraId, checksum));
        pipeline.del(checksumPathKey(cameraId, checksum));
      }
      pipeline.del(setKey);
      pipeline.del(watermarkKey(cameraId));
      pipeline.del(cameraStateKey(cameraId));
      await pipeline.exec();
      logger.info({ cameraId, count: members.length }, 'Cleared processed tracker');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}
