import type { ProcessingLogSearchInput } from './processing-logs.schema.js';
import type { PaginatedResult } from '../../types/index.js';
export declare function searchProcessingLogs(params: ProcessingLogSearchInput): Promise<PaginatedResult<unknown>>;
export declare function getProcessingStats(): Promise<{
    total: number;
    completed: number;
    failed: number;
    running: number;
    queued: number;
    byStatus: Record<string, number>;
    byType: {
        jobType: string;
        count: number;
    }[];
}>;
export declare function getStreamData(): Promise<{
    stats: {
        total: number;
        completed: number;
        failed: number;
        running: number;
        queued: number;
        byStatus: Record<string, number>;
        byType: {
            jobType: string;
            count: number;
        }[];
    };
    logs: unknown[];
}>;
export declare function retryJob(jobId: string): Promise<{
    id: string;
    status: string;
}>;
export declare function rejectJob(jobId: string): Promise<{
    id: string;
    status: string;
}>;
export declare function getDlqSummary(): Promise<{
    total: number;
    byJobType: Record<string, number>;
    jobs: {
        id: string;
        imageId: string | null;
        jobType: string;
        workerId: string | null;
        queueName: string;
        errorMessage: string | null;
        retryCount: number;
        maxRetries: number;
        queuedAt: string;
        startedAt: string | null;
        completedAt: string | null;
        imageFilename: string | null;
        cameraId: string | null;
    }[];
}>;
export declare function bulkRetryDlq(jobType?: string): Promise<{
    updated: number;
}>;
export declare function bulkRejectDlq(jobType?: string): Promise<{
    updated: number;
}>;
//# sourceMappingURL=processing-logs.service.d.ts.map