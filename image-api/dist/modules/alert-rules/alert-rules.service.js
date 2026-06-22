import { getPrisma } from '../../lib/prisma.js';
export async function listAlertRules(params) {
    const prisma = getPrisma();
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const [data, total] = await Promise.all([
        prisma.alertRule.findMany({
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.alertRule.count(),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
export async function getAlertRuleById(id) {
    const prisma = getPrisma();
    return prisma.alertRule.findUnique({ where: { id } });
}
export async function createAlertRule(input) {
    const prisma = getPrisma();
    return prisma.alertRule.create({
        data: {
            name: input.name,
            alertType: input.alertType,
            description: input.description,
            enabled: input.enabled ?? true,
            condition: (input.condition ?? {}),
            cooldownMinutes: input.cooldownMinutes ?? 60,
            notificationChannels: (input.notificationChannels ?? []),
        },
    });
}
export async function updateAlertRule(id, input) {
    const prisma = getPrisma();
    const data = {};
    if (input.name !== undefined)
        data.name = input.name;
    if (input.description !== undefined)
        data.description = input.description;
    if (input.enabled !== undefined)
        data.enabled = input.enabled;
    if (input.condition !== undefined)
        data.condition = input.condition;
    if (input.cooldownMinutes !== undefined)
        data.cooldownMinutes = input.cooldownMinutes;
    if (input.notificationChannels !== undefined)
        data.notificationChannels = input.notificationChannels;
    return prisma.alertRule.update({ where: { id }, data });
}
export async function deleteAlertRule(id) {
    const prisma = getPrisma();
    return prisma.alertRule.delete({ where: { id } });
}
//# sourceMappingURL=alert-rules.service.js.map