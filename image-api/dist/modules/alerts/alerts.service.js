import { getPrisma } from '../../lib/prisma.js';
export async function createAlert(input) {
    const prisma = getPrisma();
    return prisma.alert.create({
        data: {
            alertType: input.alertType,
            severity: input.severity ?? 'warning',
            source: input.source,
            title: input.title,
            message: input.message,
            details: (input.details ?? {}),
        },
    });
}
export async function listAlerts(params) {
    const prisma = getPrisma();
    const where = {};
    if (params.severity)
        where.severity = params.severity;
    if (params.resolved === true)
        where.resolvedAt = { not: null };
    else if (params.resolved === false)
        where.resolvedAt = null;
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const [data, total] = await Promise.all([
        prisma.alert.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.alert.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
export async function getAlertById(id) {
    const prisma = getPrisma();
    return prisma.alert.findUnique({ where: { id } });
}
export async function acknowledgeAlert(id, acknowledgedBy) {
    const prisma = getPrisma();
    return prisma.alert.update({
        where: { id },
        data: { acknowledgedAt: new Date(), acknowledgedBy },
    });
}
export async function resolveAlert(id, resolvedBy) {
    const prisma = getPrisma();
    return prisma.alert.update({
        where: { id },
        data: { resolvedAt: new Date(), resolvedBy },
    });
}
//# sourceMappingURL=alerts.service.js.map