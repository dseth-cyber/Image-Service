export interface CreateAuditLogInput {
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    description?: string | null;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
}
export declare function createAuditLog(input: CreateAuditLogInput): Promise<{
    id: string;
    description: string | null;
    createdAt: Date;
    userId: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    ipAddress: string | null;
}>;
export declare function searchAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    entity?: string;
    entityId?: string;
    userId?: string;
    from?: string;
    to?: string;
}): Promise<{
    data: {
        id: string;
        userId: string | null;
        username: string | null;
        action: string;
        entity: string;
        entityId: string | null;
        description: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        ipAddress: string | null;
        createdAt: string;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
//# sourceMappingURL=audit.service.d.ts.map