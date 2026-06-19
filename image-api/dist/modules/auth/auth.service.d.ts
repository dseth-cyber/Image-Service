import type { LoginInput, RefreshInput } from './auth.schema.js';
export declare function login(input: LoginInput): Promise<{
    id: string;
    username: string;
    email: string;
    role: import("@prisma/client").$Enums.Role;
}>;
export declare function createRefreshToken(userId: string): Promise<string>;
export declare function verifyRefreshToken(input: RefreshInput): Promise<{
    id: string;
    username: string;
    email: string;
    role: import("@prisma/client").$Enums.Role;
}>;
export declare function revokeRefreshToken(token: string): Promise<void>;
//# sourceMappingURL=auth.service.d.ts.map