import Redis from 'ioredis';
export declare class Tracker {
    private redis;
    constructor(redis: Redis);
    isProcessed(cameraId: string, checksum: string): Promise<boolean>;
    markProcessed(cameraId: string, checksum: string, imageId?: string): Promise<void>;
    markBatchProcessed(items: Array<{
        cameraId: string;
        checksum: string;
        imageId?: string;
    }>): Promise<void>;
    getProcessedCount(cameraId: string): Promise<number>;
    clearProcessed(cameraId: string): Promise<void>;
    healthCheck(): Promise<boolean>;
}
