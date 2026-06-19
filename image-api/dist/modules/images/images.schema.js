import { z } from 'zod';
export const imageSearchSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cameraId: z.string().uuid().optional(),
    status: z.enum(['pending', 'queued', 'processing', 'completed', 'failed', 'deleted', 'archived']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    q: z.string().max(256).optional(),
    tagKey: z.string().max(128).optional(),
    tagValue: z.string().max(256).optional(),
    sort: z.enum(['capturedAt', 'fileSizeBytes', 'status', 'createdAt']).default('capturedAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
});
export const updateMetadataSchema = z.object({
    tiffMetadata: z.record(z.unknown()).optional(),
    widthPx: z.number().int().positive().optional(),
    heightPx: z.number().int().positive().optional(),
    bitDepth: z.number().int().positive().optional(),
    colorSpace: z.string().max(32).optional(),
    compressionType: z.string().max(64).optional(),
    compressionRatio: z.number().min(0).max(100).optional(),
});
export const updateTagsSchema = z.record(z.string().min(1).max(256));
export const imageResponseSchema = z.object({
    id: z.string(),
    cameraId: z.string(),
    originalFilename: z.string(),
    fileSizeBytes: z.number(),
    checksumSha256: z.string().nullable(),
    checksumMd5: z.string().nullable(),
    status: z.string(),
    widthPx: z.number().nullable(),
    heightPx: z.number().nullable(),
    bitDepth: z.number().nullable(),
    colorSpace: z.string().nullable(),
    compressionType: z.string().nullable(),
    compressionRatio: z.number().nullable(),
    capturedAt: z.string(),
    ingestedAt: z.string(),
    processedAt: z.string().nullable(),
    retentionUntil: z.string().nullable(),
    files: z.array(z.object({
        id: z.string(),
        fileType: z.string(),
        fileSizeBytes: z.number(),
        mimeType: z.string().nullable(),
        storageClass: z.string(),
    })),
    tags: z.array(z.object({
        key: z.string(),
        value: z.string(),
    })),
});
export const imageSummarySchema = z.object({
    id: z.string(),
    cameraId: z.string(),
    cameraName: z.string(),
    originalFilename: z.string(),
    fileSizeBytes: z.number(),
    status: z.string(),
    widthPx: z.number().nullable(),
    heightPx: z.number().nullable(),
    capturedAt: z.string(),
});
//# sourceMappingURL=images.schema.js.map