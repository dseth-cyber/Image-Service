import { getPrisma } from '../../lib/prisma.js';
export async function getSetting(key) {
    const prisma = getPrisma();
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    return row?.value ?? null;
}
export async function setSetting(key, value) {
    const prisma = getPrisma();
    await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
}
export async function getSettings(keys) {
    const prisma = getPrisma();
    const rows = await prisma.systemSetting.findMany({
        where: { key: { in: keys } },
    });
    const map = {};
    for (const k of keys)
        map[k] = null;
    for (const row of rows)
        map[row.key] = row.value;
    return map;
}
export async function getAllSettings() {
    const prisma = getPrisma();
    const rows = await prisma.systemSetting.findMany();
    const map = {};
    for (const row of rows)
        map[row.key] = row.value;
    return map;
}
//# sourceMappingURL=system-settings.service.js.map