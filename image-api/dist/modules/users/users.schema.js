import { z } from 'zod';
export const createUserSchema = z.object({
    username: z.string().min(1).max(128),
    email: z.string().email().max(256),
    password: z.string().min(6).max(256),
    role: z.enum(['admin', 'operator', 'viewer']).default('viewer'),
});
export const updateUserSchema = z.object({
    email: z.string().email().max(256).optional(),
    password: z.string().min(6).max(256).optional(),
    role: z.enum(['admin', 'operator', 'viewer']).optional(),
    enabled: z.boolean().optional(),
});
//# sourceMappingURL=users.schema.js.map