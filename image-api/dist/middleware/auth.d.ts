import type { FastifyReply, FastifyRequest } from 'fastify';
export interface AuthenticatedUser {
    id: string;
    username: string;
    email: string;
    role: string;
}
export declare function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void>;
//# sourceMappingURL=auth.d.ts.map