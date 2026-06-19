import { z } from 'zod';
export declare const createUserSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["admin", "operator", "viewer"]>>;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
    email: string;
    role: "admin" | "operator" | "viewer";
}, {
    username: string;
    password: string;
    email: string;
    role?: "admin" | "operator" | "viewer" | undefined;
}>;
export declare const updateUserSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["admin", "operator", "viewer"]>>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    password?: string | undefined;
    email?: string | undefined;
    role?: "admin" | "operator" | "viewer" | undefined;
    enabled?: boolean | undefined;
}, {
    password?: string | undefined;
    email?: string | undefined;
    role?: "admin" | "operator" | "viewer" | undefined;
    enabled?: boolean | undefined;
}>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
//# sourceMappingURL=users.schema.d.ts.map