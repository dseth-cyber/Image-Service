import type { CreateCameraInput, UpdateCameraInput } from './cameras.schema.js';
export declare function listCameras(filters?: {
    status?: string;
    enabled?: boolean;
}): Promise<({
    retentionPolicy: {
        id: string;
        name: string;
    };
} & {
    status: import("@prisma/client").$Enums.CameraStatus;
    id: string;
    name: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    ipAddress: string;
    smbSharePath: string;
    smbDomain: string | null;
    smbUsername: string;
    smbPasswordEncrypted: string;
    smbSubdirectoryPattern: string | null;
    pollIntervalSeconds: number;
    timezone: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue;
    captureMode: string;
    retentionPolicyId: string;
    lastPolledAt: Date | null;
    lastImageAt: Date | null;
    totalImagesCount: bigint;
})[]>;
export declare function getCameraById(id: string): Promise<{
    retentionPolicy: {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        rawRetentionDays: number;
        processedRetentionDays: number;
        thumbnailRetentionDays: number;
        archiveRawDays: number | null;
        archiveEnabled: boolean;
        coldStorageClass: import("@prisma/client").$Enums.StorageClass;
    };
} & {
    status: import("@prisma/client").$Enums.CameraStatus;
    id: string;
    name: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    ipAddress: string;
    smbSharePath: string;
    smbDomain: string | null;
    smbUsername: string;
    smbPasswordEncrypted: string;
    smbSubdirectoryPattern: string | null;
    pollIntervalSeconds: number;
    timezone: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue;
    captureMode: string;
    retentionPolicyId: string;
    lastPolledAt: Date | null;
    lastImageAt: Date | null;
    totalImagesCount: bigint;
}>;
export declare function createCamera(input: CreateCameraInput): Promise<{
    retentionPolicy: {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        rawRetentionDays: number;
        processedRetentionDays: number;
        thumbnailRetentionDays: number;
        archiveRawDays: number | null;
        archiveEnabled: boolean;
        coldStorageClass: import("@prisma/client").$Enums.StorageClass;
    };
} & {
    status: import("@prisma/client").$Enums.CameraStatus;
    id: string;
    name: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    ipAddress: string;
    smbSharePath: string;
    smbDomain: string | null;
    smbUsername: string;
    smbPasswordEncrypted: string;
    smbSubdirectoryPattern: string | null;
    pollIntervalSeconds: number;
    timezone: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue;
    captureMode: string;
    retentionPolicyId: string;
    lastPolledAt: Date | null;
    lastImageAt: Date | null;
    totalImagesCount: bigint;
}>;
export declare function updateCamera(id: string, input: UpdateCameraInput): Promise<{
    retentionPolicy: {
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        rawRetentionDays: number;
        processedRetentionDays: number;
        thumbnailRetentionDays: number;
        archiveRawDays: number | null;
        archiveEnabled: boolean;
        coldStorageClass: import("@prisma/client").$Enums.StorageClass;
    };
} & {
    status: import("@prisma/client").$Enums.CameraStatus;
    id: string;
    name: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    ipAddress: string;
    smbSharePath: string;
    smbDomain: string | null;
    smbUsername: string;
    smbPasswordEncrypted: string;
    smbSubdirectoryPattern: string | null;
    pollIntervalSeconds: number;
    timezone: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue;
    captureMode: string;
    retentionPolicyId: string;
    lastPolledAt: Date | null;
    lastImageAt: Date | null;
    totalImagesCount: bigint;
}>;
export declare function deactivateCamera(id: string): Promise<void>;
//# sourceMappingURL=cameras.service.d.ts.map