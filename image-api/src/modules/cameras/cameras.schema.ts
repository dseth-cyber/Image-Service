import { z } from 'zod';

export const createCameraSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().optional(),
  ipAddress: z.string().min(1).max(45),
  smbSharePath: z.string().min(1),
  smbDomain: z.string().max(128).optional(),
  smbUsername: z.string().min(1).max(256),
  smbPasswordEncrypted: z.string().min(1),
  smbSubdirectoryPattern: z.string().max(256).optional(),
  pollIntervalSeconds: z.number().int().min(5).max(3600).default(30),
  timezone: z.string().max(64).default('UTC'),
  captureMode: z.enum(['on_demand', 'periodic', 'continuous']).default('periodic'),
  retentionPolicyId: z.string().uuid(),
  metadata: z.record(z.unknown()).default({}),
});

export const updateCameraSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().optional(),
  ipAddress: z.string().min(1).max(45).optional(),
  smbSharePath: z.string().min(1).optional(),
  smbDomain: z.string().max(128).optional(),
  smbUsername: z.string().min(1).max(256).optional(),
  smbPasswordEncrypted: z.string().min(1).optional(),
  smbSubdirectoryPattern: z.string().max(256).optional(),
  pollIntervalSeconds: z.number().int().min(5).max(3600).optional(),
  timezone: z.string().max(64).optional(),
  captureMode: z.enum(['on_demand', 'periodic', 'continuous']).optional(),
  retentionPolicyId: z.string().uuid().optional(),
  enabled: z.boolean().optional(),
  lastPolledAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const cameraQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'error', 'maintenance']).optional(),
  enabled: z.coerce.boolean().optional(),
});

export type CreateCameraInput = z.infer<typeof createCameraSchema>;
export type UpdateCameraInput = z.infer<typeof updateCameraSchema>;
