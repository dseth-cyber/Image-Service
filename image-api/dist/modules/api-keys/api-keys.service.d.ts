import type { Prisma } from '@prisma/client';
export declare function listApiKeys(params: {
    page?: number;
    limit?: number;
}): Promise<{
    data: {
        id: string;
        name: string;
        permissions: Prisma.JsonValue;
        createdAt: Date;
        updatedAt: Date;
        enabled: boolean;
        expiresAt: Date | null;
        tokenPrefix: string;
        lastUsedAt: Date | null;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare function getApiKeyById(id: string): Promise<{
    id: string;
    name: string;
    permissions: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
    enabled: boolean;
    expiresAt: Date | null;
    tokenPrefix: string;
    lastUsedAt: Date | null;
    createdBy: string | null;
} | null>;
export interface CreateApiKeyInput {
    name: string;
    permissions?: string[];
    expiresAt?: string;
    createdBy?: string;
}
export declare function createApiKey(input: CreateApiKeyInput): Promise<{
    token: string;
    prefix: string;
}>;
export interface UpdateApiKeyInput {
    name?: string;
    permissions?: string[];
    enabled?: boolean;
    expiresAt?: string | null;
}
export declare function updateApiKey(id: string, input: UpdateApiKeyInput): Promise<{
    id: string;
    name: string;
    permissions: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
    enabled: boolean;
    expiresAt: Date | null;
    tokenHash: string;
    tokenPrefix: string;
    lastUsedAt: Date | null;
    createdBy: string | null;
}>;
export declare function deleteApiKey(id: string): Promise<{
    id: string;
    name: string;
    permissions: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
    enabled: boolean;
    expiresAt: Date | null;
    tokenHash: string;
    tokenPrefix: string;
    lastUsedAt: Date | null;
    createdBy: string | null;
}>;
export declare function validateApiToken(token: string): Promise<boolean>;
//# sourceMappingURL=api-keys.service.d.ts.map