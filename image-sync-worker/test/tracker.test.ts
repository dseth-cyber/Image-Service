import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedis = {
  exists: vi.fn(),
  setex: vi.fn(),
  sadd: vi.fn(),
  expire: vi.fn(),
  pipeline: vi.fn(),
  scard: vi.fn(),
  smembers: vi.fn(),
  del: vi.fn(),
  ping: vi.fn(),
};

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => mockRedis),
}));

vi.mock('../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { Tracker } from '../src/lib/tracker.js';

describe('Tracker', () => {
  let tracker: Tracker;

  beforeEach(() => {
    vi.clearAllMocks();
    tracker = new Tracker(mockRedis as unknown as import('ioredis').Redis);
  });

  describe('isProcessed', () => {
    it('should return true when key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);
      const result = await tracker.isProcessed('cam-1', 'abc123');
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);
      const result = await tracker.isProcessed('cam-1', 'abc123');
      expect(result).toBe(false);
    });
  });

  describe('markProcessed', () => {
    it('should set key with TTL and add to set', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      mockRedis.sadd.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await tracker.markProcessed('cam-1', 'abc123', 'img-1');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'sync:processed:cam-1:abc123',
        expect.any(Number),
        'img-1',
      );
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        'sync:camera:cam-1:checksums',
        'abc123',
      );
    });
  });

  describe('markBatchProcessed', () => {
    it('should use pipeline for batch operations', async () => {
      const mockPipeline = {
        setex: vi.fn().mockReturnThis(),
        sadd: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await tracker.markBatchProcessed([
        { cameraId: 'cam-1', checksum: 'abc', imageId: 'img-1' },
        { cameraId: 'cam-1', checksum: 'def', imageId: 'img-2' },
      ]);

      expect(mockPipeline.setex).toHaveBeenCalledTimes(2);
      expect(mockPipeline.sadd).toHaveBeenCalledTimes(2);
      expect(mockPipeline.exec).toHaveBeenCalledOnce();
    });
  });

  describe('getProcessedCount', () => {
    it('should return count from Redis set', async () => {
      mockRedis.scard.mockResolvedValue(5);
      const count = await tracker.getProcessedCount('cam-1');
      expect(count).toBe(5);
    });
  });

  describe('clearProcessed', () => {
    it('should clear all processed entries for a camera', async () => {
      mockRedis.smembers.mockResolvedValue(['abc', 'def']);
      const mockPipeline = {
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await tracker.clearProcessed('cam-1');

      expect(mockPipeline.del).toHaveBeenCalledTimes(3);
      expect(mockPipeline.exec).toHaveBeenCalledOnce();
    });
  });

  describe('healthCheck', () => {
    it('should return true when Redis responds', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      const healthy = await tracker.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should return false when Redis fails', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection refused'));
      const healthy = await tracker.healthCheck();
      expect(healthy).toBe(false);
    });
  });
});
