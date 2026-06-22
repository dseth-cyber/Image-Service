import type { AlertType, Prisma } from '@prisma/client';
export declare function listAlertRules(params: {
    page?: number;
    limit?: number;
}): Promise<{
    data: {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        enabled: boolean;
        alertType: import("@prisma/client").$Enums.AlertType;
        condition: Prisma.JsonValue;
        cooldownMinutes: number;
        notificationChannels: Prisma.JsonValue;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare function getAlertRuleById(id: string): Promise<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    enabled: boolean;
    alertType: import("@prisma/client").$Enums.AlertType;
    condition: Prisma.JsonValue;
    cooldownMinutes: number;
    notificationChannels: Prisma.JsonValue;
} | null>;
export interface CreateAlertRuleInput {
    name: string;
    alertType: AlertType;
    description?: string;
    enabled?: boolean;
    condition?: Record<string, unknown>;
    cooldownMinutes?: number;
    notificationChannels?: string[];
}
export declare function createAlertRule(input: CreateAlertRuleInput): Promise<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    enabled: boolean;
    alertType: import("@prisma/client").$Enums.AlertType;
    condition: Prisma.JsonValue;
    cooldownMinutes: number;
    notificationChannels: Prisma.JsonValue;
}>;
export interface UpdateAlertRuleInput {
    name?: string;
    description?: string;
    enabled?: boolean;
    condition?: Record<string, unknown>;
    cooldownMinutes?: number;
    notificationChannels?: string[];
}
export declare function updateAlertRule(id: string, input: UpdateAlertRuleInput): Promise<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    enabled: boolean;
    alertType: import("@prisma/client").$Enums.AlertType;
    condition: Prisma.JsonValue;
    cooldownMinutes: number;
    notificationChannels: Prisma.JsonValue;
}>;
export declare function deleteAlertRule(id: string): Promise<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    enabled: boolean;
    alertType: import("@prisma/client").$Enums.AlertType;
    condition: Prisma.JsonValue;
    cooldownMinutes: number;
    notificationChannels: Prisma.JsonValue;
}>;
//# sourceMappingURL=alert-rules.service.d.ts.map