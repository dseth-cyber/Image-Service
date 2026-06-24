import { z } from 'zod';
export const ClearDataInput = z.object({
    password: z.string().min(1, 'Password is required'),
    confirmation: z.literal('DELETE', {
        errorMap: () => ({ message: 'Type DELETE to confirm' }),
    }),
});
//# sourceMappingURL=admin.schema.js.map