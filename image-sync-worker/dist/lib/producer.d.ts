import type Redis from 'ioredis';
import type { ProcessingJobPayload } from '../types/index.js';
export declare class JobProducer {
    private queue;
    private events;
    constructor(redis: Redis);
    enqueue(payload: ProcessingJobPayload, priority?: number): Promise<string>;
    enqueueBatch(items: ProcessingJobPayload[], priority?: number): Promise<string[]>;
    getQueueSize(): Promise<{
        waiting: number;
        active: number;
        failed: number;
    }>;
    close(): Promise<void>;
}
