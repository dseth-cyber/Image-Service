import { z } from 'zod';
export declare const createCameraSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    ipAddress: z.ZodString;
    smbSharePath: z.ZodString;
    smbDomain: z.ZodOptional<z.ZodString>;
    smbUsername: z.ZodString;
    smbPasswordEncrypted: z.ZodString;
    smbSubdirectoryPattern: z.ZodOptional<z.ZodString>;
    pollIntervalSeconds: z.ZodDefault<z.ZodNumber>;
    timezone: z.ZodDefault<z.ZodString>;
    captureMode: z.ZodDefault<z.ZodEnum<["on_demand", "periodic", "continuous"]>>;
    retentionPolicyId: z.ZodString;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    metadata: Record<string, unknown>;
    ipAddress: string;
    smbSharePath: string;
    smbUsername: string;
    smbPasswordEncrypted: string;
    pollIntervalSeconds: number;
    timezone: string;
    captureMode: "on_demand" | "periodic" | "continuous";
    retentionPolicyId: string;
    description?: string | undefined;
    smbDomain?: string | undefined;
    smbSubdirectoryPattern?: string | undefined;
}, {
    name: string;
    ipAddress: string;
    smbSharePath: string;
    smbUsername: string;
    smbPasswordEncrypted: string;
    retentionPolicyId: string;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    smbDomain?: string | undefined;
    smbSubdirectoryPattern?: string | undefined;
    pollIntervalSeconds?: number | undefined;
    timezone?: string | undefined;
    captureMode?: "on_demand" | "periodic" | "continuous" | undefined;
}>;
export declare const updateCameraSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ipAddress: z.ZodOptional<z.ZodString>;
    smbSharePath: z.ZodOptional<z.ZodString>;
    smbDomain: z.ZodOptional<z.ZodString>;
    smbUsername: z.ZodOptional<z.ZodString>;
    smbPasswordEncrypted: z.ZodOptional<z.ZodString>;
    smbSubdirectoryPattern: z.ZodOptional<z.ZodString>;
    pollIntervalSeconds: z.ZodOptional<z.ZodNumber>;
    timezone: z.ZodOptional<z.ZodString>;
    captureMode: z.ZodOptional<z.ZodEnum<["on_demand", "periodic", "continuous"]>>;
    retentionPolicyId: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    lastPolledAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    enabled?: boolean | undefined;
    metadata?: Record<string, unknown> | undefined;
    ipAddress?: string | undefined;
    smbSharePath?: string | undefined;
    smbDomain?: string | undefined;
    smbUsername?: string | undefined;
    smbPasswordEncrypted?: string | undefined;
    smbSubdirectoryPattern?: string | undefined;
    pollIntervalSeconds?: number | undefined;
    timezone?: string | undefined;
    captureMode?: "on_demand" | "periodic" | "continuous" | undefined;
    retentionPolicyId?: string | undefined;
    lastPolledAt?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    enabled?: boolean | undefined;
    metadata?: Record<string, unknown> | undefined;
    ipAddress?: string | undefined;
    smbSharePath?: string | undefined;
    smbDomain?: string | undefined;
    smbUsername?: string | undefined;
    smbPasswordEncrypted?: string | undefined;
    smbSubdirectoryPattern?: string | undefined;
    pollIntervalSeconds?: number | undefined;
    timezone?: string | undefined;
    captureMode?: "on_demand" | "periodic" | "continuous" | undefined;
    retentionPolicyId?: string | undefined;
    lastPolledAt?: string | undefined;
}>;
export declare const cameraQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["active", "inactive", "error", "maintenance"]>>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status?: "error" | "active" | "inactive" | "maintenance" | undefined;
    enabled?: boolean | undefined;
}, {
    status?: "error" | "active" | "inactive" | "maintenance" | undefined;
    enabled?: boolean | undefined;
}>;
export type CreateCameraInput = z.infer<typeof createCameraSchema>;
export type UpdateCameraInput = z.infer<typeof updateCameraSchema>;
//# sourceMappingURL=cameras.schema.d.ts.map