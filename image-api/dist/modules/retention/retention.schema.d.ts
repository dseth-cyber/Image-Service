import { z } from 'zod';
export declare const createRetentionPolicySchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    rawRetentionDays: z.ZodNumber;
    processedRetentionDays: z.ZodNumber;
    thumbnailRetentionDays: z.ZodNumber;
    archiveRawDays: z.ZodOptional<z.ZodNumber>;
    archiveEnabled: z.ZodDefault<z.ZodBoolean>;
    coldStorageClass: z.ZodDefault<z.ZodEnum<["hot", "warm", "cold"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    rawRetentionDays: number;
    processedRetentionDays: number;
    thumbnailRetentionDays: number;
    archiveEnabled: boolean;
    coldStorageClass: "hot" | "warm" | "cold";
    description?: string | undefined;
    archiveRawDays?: number | undefined;
}, {
    name: string;
    rawRetentionDays: number;
    processedRetentionDays: number;
    thumbnailRetentionDays: number;
    description?: string | undefined;
    archiveRawDays?: number | undefined;
    archiveEnabled?: boolean | undefined;
    coldStorageClass?: "hot" | "warm" | "cold" | undefined;
}>;
export declare const updateRetentionPolicySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    rawRetentionDays: z.ZodOptional<z.ZodNumber>;
    processedRetentionDays: z.ZodOptional<z.ZodNumber>;
    thumbnailRetentionDays: z.ZodOptional<z.ZodNumber>;
    archiveRawDays: z.ZodOptional<z.ZodNumber>;
    archiveEnabled: z.ZodOptional<z.ZodBoolean>;
    coldStorageClass: z.ZodOptional<z.ZodEnum<["hot", "warm", "cold"]>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    rawRetentionDays?: number | undefined;
    processedRetentionDays?: number | undefined;
    thumbnailRetentionDays?: number | undefined;
    archiveRawDays?: number | undefined;
    archiveEnabled?: boolean | undefined;
    coldStorageClass?: "hot" | "warm" | "cold" | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    rawRetentionDays?: number | undefined;
    processedRetentionDays?: number | undefined;
    thumbnailRetentionDays?: number | undefined;
    archiveRawDays?: number | undefined;
    archiveEnabled?: boolean | undefined;
    coldStorageClass?: "hot" | "warm" | "cold" | undefined;
}>;
export type CreateRetentionPolicyInput = z.infer<typeof createRetentionPolicySchema>;
export type UpdateRetentionPolicyInput = z.infer<typeof updateRetentionPolicySchema>;
//# sourceMappingURL=retention.schema.d.ts.map