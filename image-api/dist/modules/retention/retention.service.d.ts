import type { CreateRetentionPolicyInput, UpdateRetentionPolicyInput } from './retention.schema.js';
export declare function listPolicies(): Promise<({
    _count: {
        cameras: number;
    };
} & {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    rawRetentionDays: number;
    processedRetentionDays: number;
    thumbnailRetentionDays: number;
    archiveRawDays: number | null;
    archiveEnabled: boolean;
    coldStorageClass: import("@prisma/client").$Enums.StorageClass;
})[]>;
export declare function getPolicyById(id: string): Promise<{
    cameras: {
        status: import("@prisma/client").$Enums.CameraStatus;
        id: string;
        name: string;
    }[];
} & {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    rawRetentionDays: number;
    processedRetentionDays: number;
    thumbnailRetentionDays: number;
    archiveRawDays: number | null;
    archiveEnabled: boolean;
    coldStorageClass: import("@prisma/client").$Enums.StorageClass;
}>;
export declare function createPolicy(input: CreateRetentionPolicyInput): Promise<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    rawRetentionDays: number;
    processedRetentionDays: number;
    thumbnailRetentionDays: number;
    archiveRawDays: number | null;
    archiveEnabled: boolean;
    coldStorageClass: import("@prisma/client").$Enums.StorageClass;
}>;
export declare function updatePolicy(id: string, input: UpdateRetentionPolicyInput): Promise<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    rawRetentionDays: number;
    processedRetentionDays: number;
    thumbnailRetentionDays: number;
    archiveRawDays: number | null;
    archiveEnabled: boolean;
    coldStorageClass: import("@prisma/client").$Enums.StorageClass;
}>;
export declare function deletePolicy(id: string): Promise<void>;
//# sourceMappingURL=retention.service.d.ts.map