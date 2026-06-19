import { z } from 'zod';
export declare const imageSearchSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    cameraId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["pending", "queued", "processing", "completed", "failed", "deleted", "archived"]>>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
    q: z.ZodOptional<z.ZodString>;
    tagKey: z.ZodOptional<z.ZodString>;
    tagValue: z.ZodOptional<z.ZodString>;
    sort: z.ZodDefault<z.ZodEnum<["capturedAt", "fileSizeBytes", "status", "createdAt"]>>;
    order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sort: "status" | "createdAt" | "fileSizeBytes" | "capturedAt";
    limit: number;
    page: number;
    order: "asc" | "desc";
    status?: "pending" | "queued" | "processing" | "completed" | "failed" | "deleted" | "archived" | undefined;
    cameraId?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
    q?: string | undefined;
    tagKey?: string | undefined;
    tagValue?: string | undefined;
}, {
    sort?: "status" | "createdAt" | "fileSizeBytes" | "capturedAt" | undefined;
    status?: "pending" | "queued" | "processing" | "completed" | "failed" | "deleted" | "archived" | undefined;
    cameraId?: string | undefined;
    limit?: number | undefined;
    from?: string | undefined;
    page?: number | undefined;
    to?: string | undefined;
    q?: string | undefined;
    tagKey?: string | undefined;
    tagValue?: string | undefined;
    order?: "asc" | "desc" | undefined;
}>;
export declare const updateMetadataSchema: z.ZodObject<{
    tiffMetadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    widthPx: z.ZodOptional<z.ZodNumber>;
    heightPx: z.ZodOptional<z.ZodNumber>;
    bitDepth: z.ZodOptional<z.ZodNumber>;
    colorSpace: z.ZodOptional<z.ZodString>;
    compressionType: z.ZodOptional<z.ZodString>;
    compressionRatio: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    widthPx?: number | undefined;
    heightPx?: number | undefined;
    bitDepth?: number | undefined;
    colorSpace?: string | undefined;
    compressionType?: string | undefined;
    compressionRatio?: number | undefined;
    tiffMetadata?: Record<string, unknown> | undefined;
}, {
    widthPx?: number | undefined;
    heightPx?: number | undefined;
    bitDepth?: number | undefined;
    colorSpace?: string | undefined;
    compressionType?: string | undefined;
    compressionRatio?: number | undefined;
    tiffMetadata?: Record<string, unknown> | undefined;
}>;
export declare const updateTagsSchema: z.ZodRecord<z.ZodString, z.ZodString>;
export declare const imageResponseSchema: z.ZodObject<{
    id: z.ZodString;
    cameraId: z.ZodString;
    originalFilename: z.ZodString;
    fileSizeBytes: z.ZodNumber;
    checksumSha256: z.ZodNullable<z.ZodString>;
    checksumMd5: z.ZodNullable<z.ZodString>;
    status: z.ZodString;
    widthPx: z.ZodNullable<z.ZodNumber>;
    heightPx: z.ZodNullable<z.ZodNumber>;
    bitDepth: z.ZodNullable<z.ZodNumber>;
    colorSpace: z.ZodNullable<z.ZodString>;
    compressionType: z.ZodNullable<z.ZodString>;
    compressionRatio: z.ZodNullable<z.ZodNumber>;
    capturedAt: z.ZodString;
    ingestedAt: z.ZodString;
    processedAt: z.ZodNullable<z.ZodString>;
    retentionUntil: z.ZodNullable<z.ZodString>;
    files: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        fileType: z.ZodString;
        fileSizeBytes: z.ZodNumber;
        mimeType: z.ZodNullable<z.ZodString>;
        storageClass: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        fileSizeBytes: number;
        fileType: string;
        storageClass: string;
        mimeType: string | null;
    }, {
        id: string;
        fileSizeBytes: number;
        fileType: string;
        storageClass: string;
        mimeType: string | null;
    }>, "many">;
    tags: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        key: string;
    }, {
        value: string;
        key: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: string;
    id: string;
    cameraId: string;
    originalFilename: string;
    fileSizeBytes: number;
    checksumSha256: string | null;
    checksumMd5: string | null;
    widthPx: number | null;
    heightPx: number | null;
    bitDepth: number | null;
    colorSpace: string | null;
    compressionType: string | null;
    compressionRatio: number | null;
    capturedAt: string;
    ingestedAt: string;
    processedAt: string | null;
    retentionUntil: string | null;
    files: {
        id: string;
        fileSizeBytes: number;
        fileType: string;
        storageClass: string;
        mimeType: string | null;
    }[];
    tags: {
        value: string;
        key: string;
    }[];
}, {
    status: string;
    id: string;
    cameraId: string;
    originalFilename: string;
    fileSizeBytes: number;
    checksumSha256: string | null;
    checksumMd5: string | null;
    widthPx: number | null;
    heightPx: number | null;
    bitDepth: number | null;
    colorSpace: string | null;
    compressionType: string | null;
    compressionRatio: number | null;
    capturedAt: string;
    ingestedAt: string;
    processedAt: string | null;
    retentionUntil: string | null;
    files: {
        id: string;
        fileSizeBytes: number;
        fileType: string;
        storageClass: string;
        mimeType: string | null;
    }[];
    tags: {
        value: string;
        key: string;
    }[];
}>;
export declare const imageSummarySchema: z.ZodObject<{
    id: z.ZodString;
    cameraId: z.ZodString;
    cameraName: z.ZodString;
    originalFilename: z.ZodString;
    fileSizeBytes: z.ZodNumber;
    status: z.ZodString;
    widthPx: z.ZodNullable<z.ZodNumber>;
    heightPx: z.ZodNullable<z.ZodNumber>;
    capturedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: string;
    id: string;
    cameraId: string;
    originalFilename: string;
    fileSizeBytes: number;
    widthPx: number | null;
    heightPx: number | null;
    capturedAt: string;
    cameraName: string;
}, {
    status: string;
    id: string;
    cameraId: string;
    originalFilename: string;
    fileSizeBytes: number;
    widthPx: number | null;
    heightPx: number | null;
    capturedAt: string;
    cameraName: string;
}>;
export type ImageSearchInput = z.infer<typeof imageSearchSchema>;
export type UpdateMetadataInput = z.infer<typeof updateMetadataSchema>;
//# sourceMappingURL=images.schema.d.ts.map