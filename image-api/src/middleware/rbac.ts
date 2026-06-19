import type { FastifyReply, FastifyRequest } from 'fastify';
import { ForbiddenError } from '../lib/errors.js';

const roleHierarchy: Record<string, number> = {
  system: 100,
  admin: 80,
  operator: 50,
  viewer: 10,
};

export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user || typeof user === 'string' || Buffer.isBuffer(user)) {
      throw new ForbiddenError('Authentication required');
    }

    const userRole = (user as Record<string, string>).role ?? '';
    const userLevel = roleHierarchy[userRole] ?? 0;
    const requiredLevel = Math.min(
      ...allowedRoles.map((r) => roleHierarchy[r] ?? 0),
    );

    if (userLevel < requiredLevel) {
      throw new ForbiddenError(
        `Insufficient role. Required: ${allowedRoles.join(' or ')}, got: ${userRole}`,
      );
    }
  };
}
