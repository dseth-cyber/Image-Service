import type { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError } from '../lib/errors.js';
import { config } from '../config/index.js';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // Service-to-service API key authentication
  const apiKey = request.headers['x-service-api-key'];
  const apiKeyStr = Array.isArray(apiKey) ? apiKey[0] : apiKey;
  if (apiKeyStr && config.serviceApiKey && apiKeyStr === config.serviceApiKey) {
    (request as unknown as { user: AuthenticatedUser }).user = {
      id: 'system-service',
      username: 'system',
      email: 'system@image-service.local',
      role: 'system',
    };
    return;
  }

  // JWT authentication
  try {
    await request.jwtVerify();
    const payload = request.user as unknown as AuthenticatedUser;
    if (!payload || !payload.id) {
      throw new UnauthorizedError('Invalid token payload');
    }
  } catch (err) {
    // Fallback: token in query parameter (for GET file downloads via window.open)
    if (request.method === 'GET') {
      const queryToken = (request.query as Record<string, string>)?.['token'];
      if (queryToken) {
        try {
          const decoded = request.server.jwt.verify(queryToken) as AuthenticatedUser;
          if (decoded && decoded.id) {
            (request as unknown as { user: AuthenticatedUser }).user = {
              id: decoded.id, username: decoded.username ?? 'unknown',
              email: decoded.email ?? '', role: decoded.role ?? 'user',
            };
            return;
          }
        } catch { /* fall through to error */ }
      }
    }
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    throw new UnauthorizedError('Invalid or expired token');
  }
}
