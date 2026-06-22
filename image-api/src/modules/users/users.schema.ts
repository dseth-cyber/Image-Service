import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(1).max(128),
  email: z.string().email().max(256),
  password: z.string().min(6).max(256),
  role: z.string().min(1).max(64).default('viewer'),
  customPermissions: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().max(256).optional(),
  password: z.string().min(6).max(256).optional(),
  role: z.string().min(1).max(64).optional(),
  enabled: z.boolean().optional(),
  customPermissions: z.array(z.string()).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
