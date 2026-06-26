import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { loginSchema, refreshSchema } from './auth.schema.js';
import * as authService from './auth.service.js';
import { config } from '../../config/index.js';
import type { AuthenticatedUser } from '../../types/index.js';
import { getUserPermissions } from '../../middleware/rbac.js';

async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const input = loginSchema.parse(request.body);

  const user = await authService.login(input);

  const accessToken = await reply.jwtSign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    { expiresIn: config.jwt.accessExpiresIn },
  );

  const refreshToken = await authService.createRefreshToken(user.id);
  const permissions = await getUserPermissions(user.id);

  return reply.status(200).send({
    accessToken,
    refreshToken,
    user: { ...user, permissions, lastLogin: new Date().toISOString() },
  });
}

async function refreshHandler(request: FastifyRequest, reply: FastifyReply) {
  const input = refreshSchema.parse(request.body);

  const user = await authService.verifyRefreshToken(input);

  const accessToken = await reply.jwtSign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    { expiresIn: config.jwt.accessExpiresIn },
  );

  const refreshToken = await authService.createRefreshToken(user.id);

  return reply.status(200).send({ accessToken, refreshToken });
}

async function meHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as unknown as AuthenticatedUser | null;
  if (!user) {
    return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Not authenticated' });
  }
  const permissions = await getUserPermissions(user.id);
  return reply.status(200).send({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    permissions,
    lastLogin: null,
  });
}

async function logoutHandler(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await authService.revokeRefreshToken(token);
  }
  return reply.status(204).send();
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/login', loginHandler);
  app.post('/refresh', refreshHandler);
  app.get('/me', { preHandler: [app.authenticate] }, meHandler);
  app.post('/logout', { preHandler: [app.authenticate] }, logoutHandler);
}
