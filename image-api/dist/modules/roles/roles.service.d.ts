import type { CreateRoleInput, UpdateRoleInput } from './roles.schema.js';
export declare function listRoles(): Promise<({
    _count: {
        users: number;
    };
} & {
    code: string;
    id: string;
    nameTh: string | null;
    nameEn: string | null;
    nameCn: string | null;
    nameMm: string | null;
    nameJp: string | null;
    description: string | null;
    permissions: import("@prisma/client/runtime/library").JsonValue;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
})[]>;
export declare function getRoleById(id: string): Promise<{
    code: string;
    id: string;
    nameTh: string | null;
    nameEn: string | null;
    nameCn: string | null;
    nameMm: string | null;
    nameJp: string | null;
    description: string | null;
    permissions: import("@prisma/client/runtime/library").JsonValue;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function getRoleByCode(code: string): Promise<{
    code: string;
    id: string;
    nameTh: string | null;
    nameEn: string | null;
    nameCn: string | null;
    nameMm: string | null;
    nameJp: string | null;
    description: string | null;
    permissions: import("@prisma/client/runtime/library").JsonValue;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
} | null>;
export declare function createRole(input: CreateRoleInput): Promise<{
    code: string;
    id: string;
    nameTh: string | null;
    nameEn: string | null;
    nameCn: string | null;
    nameMm: string | null;
    nameJp: string | null;
    description: string | null;
    permissions: import("@prisma/client/runtime/library").JsonValue;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function updateRole(id: string, input: UpdateRoleInput): Promise<{
    code: string;
    id: string;
    nameTh: string | null;
    nameEn: string | null;
    nameCn: string | null;
    nameMm: string | null;
    nameJp: string | null;
    description: string | null;
    permissions: import("@prisma/client/runtime/library").JsonValue;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function deleteRole(id: string): Promise<void>;
//# sourceMappingURL=roles.service.d.ts.map