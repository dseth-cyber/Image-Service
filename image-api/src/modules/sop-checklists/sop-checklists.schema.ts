import { z } from 'zod';

export const sopStepSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const createChecklistSchema = z.object({
  reasonCode: z.string().min(1).max(64),
  title: z.string().min(1).max(256),
  steps: z.array(z.object({ text: z.string().min(1) })).min(1).max(50),
});

export const updateChecklistSchema = z.object({
  title: z.string().min(1).max(256).optional(),
  steps: z.array(sopStepSchema).min(1).max(50).optional(),
  isActive: z.coerce.boolean().optional(),
});

export const toggleStepSchema = z.object({
  stepId: z.string().min(1),
  stepText: z.string().min(1),
  checked: z.coerce.boolean(),
});

export type CreateChecklistInput = z.infer<typeof createChecklistSchema>;
export type UpdateChecklistInput = z.infer<typeof updateChecklistSchema>;
export type ToggleStepInput = z.infer<typeof toggleStepSchema>;
