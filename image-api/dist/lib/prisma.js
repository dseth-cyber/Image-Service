import { PrismaClient } from '@prisma/client';
let prisma;
export function getPrisma() {
    if (!prisma) {
        prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development'
                ? [{ emit: 'event', level: 'query' }, 'info', 'warn', 'error']
                : ['warn', 'error'],
        });
    }
    return prisma;
}
export async function disconnectPrisma() {
    if (prisma) {
        await prisma.$disconnect();
    }
}
export async function checkDatabaseConnection() {
    try {
        const client = getPrisma();
        await client.$queryRaw `SELECT 1`;
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=prisma.js.map