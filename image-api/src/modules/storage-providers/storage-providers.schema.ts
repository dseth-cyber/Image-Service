import { z } from 'zod';

export const providerTypeSchema = z.enum(['s3', 'local']);

export const s3ConfigSchema = z.object({
  endpoint: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535).default(9000),
  accessKey: z.string().min(1),
  secretKey: z.string().min(1),
  bucket: z.string().min(1),
  useSSL: z.coerce.boolean().default(false),
});

export const localDiskConfigSchema = z.object({
  basePath: z.string().min(1),
});

export const providerConfigSchema = z.union([s3ConfigSchema, localDiskConfigSchema]);

export const createProviderSchema = z.object({
  name: z.string().min(1).max(128),
  type: providerTypeSchema,
  config: providerConfigSchema,
  isDefault: z.coerce.boolean().optional().default(false),
  priority: z.coerce.number().int().min(0).optional().default(0),
  description: z.string().optional(),
});

export const updateProviderSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  config: providerConfigSchema.optional(),
  isDefault: z.coerce.boolean().optional(),
  priority: z.coerce.number().int().min(0).optional(),
  description: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
