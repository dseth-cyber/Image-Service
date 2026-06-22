import bcrypt from 'bcryptjs';
import { getPrisma } from '../../lib/prisma.js';
export async function listUsers(params) {
    const prisma = getPrisma();
    const where = {};
    if (params.enabled !== undefined)
        where.enabled = params.enabled;
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const [data, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: { id: true, username: true, email: true, role: true, customPermissions: true, enabled: true, lastLogin: true, createdAt: true, updatedAt: true },
            orderBy: { createdAt: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.user.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
export async function getUserById(id) {
    const prisma = getPrisma();
    return prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, email: true, role: true, customPermissions: true, enabled: true, lastLogin: true, createdAt: true, updatedAt: true },
    });
}
export async function createUser(input) {
    const prisma = getPrisma();
    const hashed = await bcrypt.hash(input.password, 10);
    return prisma.user.create({
        data: {
            username: input.username,
            email: input.email,
            password: hashed,
            role: input.role,
            customPermissions: input.customPermissions ?? [],
        },
        select: { id: true, username: true, email: true, role: true, customPermissions: true, enabled: true, lastLogin: true, createdAt: true, updatedAt: true },
    });
}
export async function updateUser(id, input) {
    const prisma = getPrisma();
    const data = {};
    if (input.email !== undefined)
        data.email = input.email;
    if (input.role !== undefined)
        data.role = input.role;
    if (input.enabled !== undefined)
        data.enabled = input.enabled;
    if (input.customPermissions !== undefined)
        data.customPermissions = input.customPermissions;
    if (input.password)
        data.password = await bcrypt.hash(input.password, 10);
    return prisma.user.update({
        where: { id },
        data,
        select: { id: true, username: true, email: true, role: true, customPermissions: true, enabled: true, lastLogin: true, createdAt: true, updatedAt: true },
    });
}
export async function deactivateUser(id) {
    const prisma = getPrisma();
    return prisma.user.update({
        where: { id },
        data: { enabled: false },
        select: { id: true, username: true, email: true, role: true, customPermissions: true, enabled: true, lastLogin: true, createdAt: true, updatedAt: true },
    });
}
//# sourceMappingURL=users.service.js.map