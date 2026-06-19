import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
}, {
    username: string;
    password: string;
}>;
export declare const refreshSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const loginResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodString;
        email: z.ZodString;
        role: z.ZodString;
        lastLogin: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        username: string;
        id: string;
        email: string;
        role: string;
        lastLogin: string | null;
    }, {
        username: string;
        id: string;
        email: string;
        role: string;
        lastLogin: string | null;
    }>;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
    accessToken: string;
    user: {
        username: string;
        id: string;
        email: string;
        role: string;
        lastLogin: string | null;
    };
}, {
    refreshToken: string;
    accessToken: string;
    user: {
        username: string;
        id: string;
        email: string;
        role: string;
        lastLogin: string | null;
    };
}>;
export declare const refreshResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    accessToken: string;
}, {
    accessToken: string;
}>;
export declare const userResponseSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodString;
    email: z.ZodString;
    role: z.ZodString;
    lastLogin: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    username: string;
    id: string;
    email: string;
    role: string;
    lastLogin: string | null;
}, {
    username: string;
    id: string;
    email: string;
    role: string;
    lastLogin: string | null;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
//# sourceMappingURL=auth.schema.d.ts.map