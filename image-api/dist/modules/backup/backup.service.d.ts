export declare function runDatabaseBackup(): Promise<{
    id: string;
    status: string;
    filePath?: string;
}>;
export declare function runMinioBackup(): Promise<{
    id: string;
    status: string;
    filePath?: string;
}>;
export declare function runRestoreTest(backupRecordId: string): Promise<{
    success: boolean;
    message: string;
}>;
export declare function getBackupStatus(): Promise<{
    database: {
        id: string;
        status: string;
        filePath: string | null;
        fileSize: number | null;
        startedAt: string;
        completedAt: string | null;
        errorMessage: string | null;
    } | null;
    minio: {
        id: string;
        status: string;
        filePath: string | null;
        fileSize: number | null;
        startedAt: string;
        completedAt: string | null;
        errorMessage: string | null;
    } | null;
    byType: Record<string, {
        total: number;
        completed: number;
        failed: number;
        running: number;
    }>;
}>;
export declare function listBackupRecords(params: {
    page?: number;
    limit?: number;
    type?: string;
}): Promise<{
    data: {
        id: string;
        type: string;
        status: string;
        filePath: string | null;
        fileSize: number | null;
        checksum: string | null;
        startedAt: string;
        completedAt: string | null;
        errorMessage: string | null;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
//# sourceMappingURL=backup.service.d.ts.map