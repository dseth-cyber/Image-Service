import { z } from 'zod';
export declare const processingLogSearchSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    status: z.ZodOptional<z.ZodString>;
    jobType: z.ZodOptional<z.ZodString>;
    q: z.ZodOptional<z.ZodString>;
    sort: z.ZodDefault<z.ZodEnum<["queuedAt", "startedAt", "completedAt", "duration"]>>;
    order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    sort: "queuedAt" | "startedAt" | "completedAt" | "duration";
    limit: number;
    page: number;
    order: "asc" | "desc";
    status?: string | undefined;
    jobType?: string | undefined;
    q?: string | undefined;
}, {
    sort?: "queuedAt" | "startedAt" | "completedAt" | "duration" | undefined;
    status?: string | undefined;
    jobType?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    q?: string | undefined;
    order?: "asc" | "desc" | undefined;
}>;
export declare const retryJobSchema: z.ZodObject<{
    imageId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    imageId?: string | undefined;
}, {
    imageId?: string | undefined;
}>;
export type ProcessingLogSearchInput = z.infer<typeof processingLogSearchSchema>;
export type RetryJobInput = z.infer<typeof retryJobSchema>;
//# sourceMappingURL=processing-logs.schema.d.ts.map