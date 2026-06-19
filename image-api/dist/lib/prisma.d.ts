import { PrismaClient } from '@prisma/client';
export declare function getPrisma(): PrismaClient;
export declare function disconnectPrisma(): Promise<void>;
export declare function checkDatabaseConnection(): Promise<boolean>;
//# sourceMappingURL=prisma.d.ts.map