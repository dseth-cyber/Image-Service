import type { FastifyReply, FastifyRequest } from 'fastify';
export declare function getUserPermissions(userId: string): Promise<string[]>;
export declare function requireRole(...allowedRoles: string[]): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
export declare function requirePermission(permission: string): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=rbac.d.ts.map