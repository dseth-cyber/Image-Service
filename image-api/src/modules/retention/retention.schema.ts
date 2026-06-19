import { z } from 'zod';

export const createRetentionPolicySchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().optional(),
  rawRetentionDays: z.number().int().min(1).max(36500),
  processedRetentionDays: z.number().int().min(1).max(36500),
  thumbnailRetentionDays: z.number().int().min(1).max(36500),
  archiveRawDays: z.number().int().min(1).optional(),
  archiveEnabled: z.boolean().default(false),
  coldStorageClass: z.enum(['hot', 'warm', 'cold']).default('cold'),
});

export const updateRetentionPolicySchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().optional(),
  rawRetentionDays: z.number().int().min(1).max(36500).optional(),
  processedRetentionDays: z.number().int().min(1).max(36500).optional(),
  thumbnailRetentionDays: z.number().int().min(1).max(36500).optional(),
  archiveRawDays: z.number().int().min(1).optional(),
  archiveEnabled: z.boolean().optional(),
  coldStorageClass: z.enum(['hot', 'warm', 'cold']).optional(),
});

export type CreateRetentionPolicyInput = z.infer<typeof createRetentionPolicySchema>;
export type UpdateRetentionPolicyInput = z.infer<typeof updateRetentionPolicySchema>;
