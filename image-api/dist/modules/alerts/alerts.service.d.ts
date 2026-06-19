import type { AlertType, AlertSeverity, Prisma } from '@prisma/client';
export interface CreateAlertInput {
    alertType: AlertType;
    severity: AlertSeverity;
    source?: string;
    title: string;
    message: string;
    details?: Record<string, unknown>;
}
export declare function createAlert(input: CreateAlertInput): Promise<{
    message: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    alertType: import("@prisma/client").$Enums.AlertType;
    severity: import("@prisma/client").$Enums.AlertSeverity;
    source: string | null;
    title: string;
    details: Prisma.JsonValue | null;
    acknowledgedAt: Date | null;
    acknowledgedBy: string | null;
    resolvedAt: Date | null;
    resolvedBy: string | null;
}>;
export declare function listAlerts(params: {
    severity?: string;
    resolved?: boolean;
    page?: number;
    limit?: number;
}): Promise<{
    data: {
        message: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        alertType: import("@prisma/client").$Enums.AlertType;
        severity: import("@prisma/client").$Enums.AlertSeverity;
        source: string | null;
        title: string;
        details: Prisma.JsonValue | null;
        acknowledgedAt: Date | null;
        acknowledgedBy: string | null;
        resolvedAt: Date | null;
        resolvedBy: string | null;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare function getAlertById(id: string): Promise<{
    message: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    alertType: import("@prisma/client").$Enums.AlertType;
    severity: import("@prisma/client").$Enums.AlertSeverity;
    source: string | null;
    title: string;
    details: Prisma.JsonValue | null;
    acknowledgedAt: Date | null;
    acknowledgedBy: string | null;
    resolvedAt: Date | null;
    resolvedBy: string | null;
} | null>;
export declare function acknowledgeAlert(id: string, acknowledgedBy: string): Promise<{
    message: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    alertType: import("@prisma/client").$Enums.AlertType;
    severity: import("@prisma/client").$Enums.AlertSeverity;
    source: string | null;
    title: string;
    details: Prisma.JsonValue | null;
    acknowledgedAt: Date | null;
    acknowledgedBy: string | null;
    resolvedAt: Date | null;
    resolvedBy: string | null;
}>;
export declare function resolveAlert(id: string, resolvedBy: string): Promise<{
    message: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    alertType: import("@prisma/client").$Enums.AlertType;
    severity: import("@prisma/client").$Enums.AlertSeverity;
    source: string | null;
    title: string;
    details: Prisma.JsonValue | null;
    acknowledgedAt: Date | null;
    acknowledgedBy: string | null;
    resolvedAt: Date | null;
    resolvedBy: string | null;
}>;
//# sourceMappingURL=alerts.service.d.ts.map