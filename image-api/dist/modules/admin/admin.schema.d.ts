import { z } from 'zod';
export declare const ClearDataInput: z.ZodObject<{
    password: z.ZodString;
    confirmation: z.ZodLiteral<"DELETE">;
}, "strip", z.ZodTypeAny, {
    password: string;
    confirmation: "DELETE";
}, {
    password: string;
    confirmation: "DELETE";
}>;
export type ClearDataInput = z.infer<typeof ClearDataInput>;
//# sourceMappingURL=admin.schema.d.ts.map