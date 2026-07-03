import { z } from 'zod';

export const createArticleSchema = z.object({
  title: z.string().min(1).max(256),
  symptoms: z.string().min(1),
  cause: z.string().optional(),
  resolution: z.string().min(1),
  verification: z.string().optional(),
  tags: z.array(z.string().min(1).max(64)).max(20).optional().default([]),
  reasonCode: z.string().max(64).optional(),
  rootCauseCode: z.string().max(64).optional(),
});

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(256).optional(),
  symptoms: z.string().min(1).optional(),
  cause: z.string().optional(),
  resolution: z.string().min(1).optional(),
  verification: z.string().optional(),
  tags: z.array(z.string().min(1).max(64)).max(20).optional(),
  reasonCode: z.string().max(64).optional(),
  rootCauseCode: z.string().max(64).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
