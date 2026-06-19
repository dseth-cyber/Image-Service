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
//# sourceMappingURL=processing-logs.service.d.ts.map