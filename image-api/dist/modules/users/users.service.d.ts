import type { CreateUserInput, UpdateUserInput } from './users.schema.js';
export declare function listUsers(params: {
    page?: number;
    limit?: number;
    enabled?: boolean;
}): Promise<{
    data: {
        username: string;
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
        lastLogin: Date | null;
        enabled: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare function getUserById(id: string): Promise<{
    username: string;
    id: string;
    email: string;
    role: import("@prisma/client").$Enums.Role;
    lastLogin: Date | null;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
} | null>;
export declare function createUser(input: CreateUserInput): Promise<{
    username: string;
    id: string;
    email: string;
    role: import("@prisma/client").$Enums.Role;
    lastLogin: Date | null;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function updateUser(id: string, input: UpdateUserInput): Promise<{
    username: string;
    id: string;
    email: string;
    role: import("@prisma/client").$Enums.Role;
    lastLogin: Date | null;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function deactivateUser(id: string): Promise<{
    username: string;
    id: string;
    email: string;
    role: import("@prisma/client").$Enums.Role;
    lastLogin: Date | null;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
//# sourceMappingURL=users.service.d.ts.map