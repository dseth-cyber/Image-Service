import { z } from 'zod';
export declare const createRoleSchema: z.ZodObject<{
    code: z.ZodString;
    nameTh: z.ZodString;
    nameEn: z.ZodString;
    nameCn: z.ZodOptional<z.ZodString>;
    nameMm: z.ZodOptional<z.ZodString>;
    nameJp: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    code: string;
    nameTh: string;
    nameEn: string;
    permissions: string[];
    sortOrder: number;
    isActive: boolean;
    nameCn?: string | undefined;
    nameMm?: string | undefined;
    nameJp?: string | undefined;
    description?: string | undefined;
}, {
    code: string;
    nameTh: string;
    nameEn: string;
    nameCn?: string | undefined;
    nameMm?: string | undefined;
    nameJp?: string | undefined;
    description?: string | undefined;
    permissions?: string[] | undefined;
    sortOrder?: number | undefined;
    isActive?: boolean | undefined;
}>;
export declare const updateRoleSchema: z.ZodObject<{
    nameTh: z.ZodOptional<z.ZodString>;
    nameEn: z.ZodOptional<z.ZodString>;
    nameCn: z.ZodOptional<z.ZodString>;
    nameMm: z.ZodOptional<z.ZodString>;
    nameJp: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    nameTh?: string | undefined;
    nameEn?: string | undefined;
    nameCn?: string | undefined;
    nameMm?: string | undefined;
    nameJp?: string | undefined;
    description?: string | undefined;
    permissions?: string[] | undefined;
    sortOrder?: number | undefined;
    isActive?: boolean | undefined;
}, {
    nameTh?: string | undefined;
    nameEn?: string | undefined;
    nameCn?: string | undefined;
    nameMm?: string | undefined;
    nameJp?: string | undefined;
    description?: string | undefined;
    permissions?: string[] | undefined;
    sortOrder?: number | undefined;
    isActive?: boolean | undefined;
}>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
//# sourceMappingURL=roles.schema.d.ts.map