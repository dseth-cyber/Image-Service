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
        role: string;
        lastLogin: Date | null;
        createdAt: Date;
        updatedAt: Date;
        customPermissions: import("@prisma/client/runtime/library").JsonValue;
        enabled: boolean;
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
    role: string;
    lastLogin: Date | null;
    createdAt: Date;
    updatedAt: Date;
    customPermissions: import("@prisma/client/runtime/library").JsonValue;
    enabled: boolean;
} | null>;
export declare function createUser(input: CreateUserInput): Promise<{
    username: string;
    id: string;
    email: string;
    role: string;
    lastLogin: Date | null;
    createdAt: Date;
    updatedAt: Date;
    customPermissions: import("@prisma/client/runtime/library").JsonValue;
    enabled: boolean;
}>;
export declare function updateUser(id: string, input: UpdateUserInput): Promise<{
    username: string;
    id: string;
    email: string;
    role: string;
    lastLogin: Date | null;
    createdAt: Date;
    updatedAt: Date;
    customPermissions: import("@prisma/client/runtime/library").JsonValue;
    enabled: boolean;
}>;
export declare function deactivateUser(id: string): Promise<{
    username: string;
    id: string;
    email: string;
    role: string;
    lastLogin: Date | null;
    createdAt: Date;
    updatedAt: Date;
    customPermissions: import("@prisma/client/runtime/library").JsonValue;
    enabled: boolean;
}>;
//# sourceMappingURL=users.service.d.ts.map