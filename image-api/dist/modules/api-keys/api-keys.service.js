import crypto from 'node:crypto';
import { getPrisma } from '../../lib/prisma.js';
function generateToken() {
    const raw = `isk_${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const prefix = raw.substring(0, 12);
    return { raw, hash, prefix };
}
export async function listApiKeys(params) {
    const prisma = getPrisma();
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const [data, total] = await Promise.all([
        prisma.apiKey.findMany({
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: { id: true, name: true, tokenPrefix: true, permissions: true, enabled: true, expiresAt: true, lastUsedAt: true, createdAt: true, updatedAt: true },
        }),
        prisma.apiKey.count(),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
export async function getApiKeyById(id) {
    const prisma = getPrisma();
    return prisma.apiKey.findUnique({
        where: { id },
        select: { id: true, name: true, tokenPrefix: true, permissions: true, enabled: true, expiresAt: true, lastUsedAt: true, createdBy: true, createdAt: true, updatedAt: true },
    });
}
export async function createApiKey(input) {
    const prisma = getPrisma();
    const { raw, hash, prefix } = generateToken();
    await prisma.apiKey.create({
        data: {
            name: input.name,
            tokenHash: hash,
            tokenPrefix: prefix,
            permissions: (input.permissions ?? ['*']),
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            createdBy: input.createdBy,
        },
    });
    return { token: raw, prefix };
}
export async function updateApiKey(id, input) {
    const prisma = getPrisma();
    const data = {};
    if (input.name !== undefined)
        data.name = input.name;
    if (input.permissions !== undefined)
        data.permissions = input.permissions;
    if (input.enabled !== undefined)
        data.enabled = input.enabled;
    if (input.expiresAt !== undefined)
        data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    return prisma.apiKey.update({ where: { id }, data });
}
export async function deleteApiKey(id) {
    const prisma = getPrisma();
    return prisma.apiKey.delete({ where: { id } });
}
export async function validateApiToken(token) {
    const prisma = getPrisma();
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const key = await prisma.apiKey.findUnique({ where: { tokenHash: hash } });
    if (!key || !key.enabled)
        return false;
    if (key.expiresAt && key.expiresAt < new Date())
        return false;
    await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    return true;
}
//# sourceMappingURL=api-keys.service.js.map