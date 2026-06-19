import { logger } from './logger.js';
import { config } from '../config/index.js';
function processedKey(cameraId, checksum) {
    return `sync:processed:${cameraId}:${checksum}`;
}
function cameraProcessedSetKey(cameraId) {
    return `sync:camera:${cameraId}:checksums`;
}
export class Tracker {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    async isProcessed(cameraId, checksum) {
        const key = processedKey(cameraId, checksum);
        const exists = await this.redis.exists(key);
        return exists === 1;
    }
    async markProcessed(cameraId, checksum, imageId) {
        const key = processedKey(cameraId, checksum);
        const ttlSeconds = config.tracker.processedTtlDays * 86400;
        await this.redis.setex(key, ttlSeconds, imageId ?? '1');
        const setKey = cameraProcessedSetKey(cameraId);
        await this.redis.sadd(setKey, checksum);
        await this.redis.expire(setKey, ttlSeconds);
        logger.debug({ cameraId, checksum: checksum.slice(0, 16) }, 'Marked as processed');
    }
    async markBatchProcessed(items) {
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
    async getProcessedCount(cameraId) {
        const setKey = cameraProcessedSetKey(cameraId);
        return this.redis.scard(setKey);
    }
    async clearProcessed(cameraId) {
        const setKey = cameraProcessedSetKey(cameraId);
        const members = await this.redis.smembers(setKey);
        if (members.length > 0) {
            const pipeline = this.redis.pipeline();
            for (const checksum of members) {
                pipeline.del(processedKey(cameraId, checksum));
            }
            pipeline.del(setKey);
            await pipeline.exec();
            logger.info({ cameraId, count: members.length }, 'Cleared processed tracker');
        }
    }
    async healthCheck() {
        try {
            await this.redis.ping();
            return true;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=tracker.js.map