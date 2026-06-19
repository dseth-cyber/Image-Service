import type { StorageSummary } from '../../types/index.js';
export declare function getStorageSummary(): Promise<StorageSummary>;
export declare function getCameraStorage(cameraId: string): Promise<{
    cameraId: string;
    fileStats: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.ImageFileGroupByOutputType, ("fileType" | "storageClass")[]> & {
        _count: {
            id: number;
        };
        _sum: {
            fileSizeBytes: bigint | null;
        };
    })[];
    recentSnapshots: {
        id: bigint;
        createdAt: Date;
        cameraId: string | null;
        snapshotDate: Date;
        fileType: import("@prisma/client").$Enums.FileType;
        storageClass: import("@prisma/client").$Enums.StorageClass;
        totalFiles: bigint;
        totalBytes: bigint;
    }[];
}>;
export declare function getStorageGrowth(days: number): Promise<{
    period: string;
    data: {
        date: string;
        imagesAdded: number;
        bytesAdded: number;
    }[];
}>;
//# sourceMappingURL=storage.service.d.ts.map