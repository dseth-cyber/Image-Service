import { getPrisma } from '../../lib/prisma.js';
import { NotFoundError, ConflictError } from '../../lib/errors.js';
export async function listRoles() {
    const prisma = getPrisma();
    return prisma.customRole.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { users: true } } },
    });
}
export async function getRoleById(id) {
    const prisma = getPrisma();
    const role = await prisma.customRole.findUnique({
        where: { id },
    });
    if (!role) {
        throw new NotFoundError('CustomRole', id);
    }
    return role;
}
export async function getRoleByCode(code) {
    const prisma = getPrisma();
    return prisma.customRole.findUnique({
        where: { code },
    });
}
export async function createRole(input) {
    const prisma = getPrisma();
    const existing = await prisma.customRole.findUnique({ where: { code: input.code } });
    if (existing) {
        throw new ConflictError(`Role with code '${input.code}' already exists`);
    }
    return prisma.customRole.create({ data: input });
}
export async function updateRole(id, input) {
    const prisma = getPrisma();
    const existing = await prisma.customRole.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError('CustomRole', id);
    }
    return prisma.customRole.update({ where: { id }, data: input });
}
export async function deleteRole(id) {
    const prisma = getPrisma();
    const existing = await prisma.customRole.findUnique({
        where: { id },
        include: { _count: { select: { users: true } } },
    });
    if (!existing) {
        throw new NotFoundError('CustomRole', id);
    }
    if (existing._count.users > 0) {
        throw new ConflictError(`Cannot delete role '${existing.code}': ${existing._count.users} user(s) are assigned to it`);
    }
    await prisma.customRole.delete({ where: { id } });
}
//# sourceMappingURL=roles.service.js.map