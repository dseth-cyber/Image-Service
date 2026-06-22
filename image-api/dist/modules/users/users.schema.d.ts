import { z } from 'zod';
export declare const createUserSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodString>;
    customPermissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
    email: string;
    role: string;
    customPermissions?: string[] | undefined;
}, {
    username: string;
    password: string;
    email: string;
    role?: string | undefined;
    customPermissions?: string[] | undefined;
}>;
export declare const updateUserSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    customPermissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    password?: string | undefined;
    email?: string | undefined;
    role?: string | undefined;
    customPermissions?: string[] | undefined;
    enabled?: boolean | undefined;
}, {
    password?: string | undefined;
    email?: string | undefined;
    role?: string | undefined;
    customPermissions?: string[] | undefined;
    enabled?: boolean | undefined;
}>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
//# sourceMappingURL=users.schema.d.ts.map