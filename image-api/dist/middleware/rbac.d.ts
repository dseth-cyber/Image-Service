import type { FastifyReply, FastifyRequest } from 'fastify';
export declare function requireRole(...allowedRoles: string[]): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=rbac.d.ts.map