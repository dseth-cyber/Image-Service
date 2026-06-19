import { loginSchema, refreshSchema } from './auth.schema.js';
import * as authService from './auth.service.js';
import { config } from '../../config/index.js';
async function loginHandler(request, reply) {
    const input = loginSchema.parse(request.body);
    const user = await authService.login(input);
    const accessToken = await reply.jwtSign({ id: user.id, username: user.username, email: user.email, role: user.role }, { expiresIn: config.jwt.accessExpiresIn });
    const refreshToken = await authService.createRefreshToken(user.id);
    return reply.status(200).send({
        accessToken,
        refreshToken,
        user: { ...user, lastLogin: new Date().toISOString() },
    });
}
async function refreshHandler(request, reply) {
    const input = refreshSchema.parse(request.body);
    const user = await authService.verifyRefreshToken(input);
    const accessToken = await reply.jwtSign({ id: user.id, username: user.username, email: user.email, role: user.role }, { expiresIn: config.jwt.accessExpiresIn });
    return reply.status(200).send({ accessToken });
}
async function meHandler(request, reply) {
    const user = request.user;
    if (!user) {
        return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Not authenticated' });
    }
    return reply.status(200).send({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: null,
    });
}
async function logoutHandler(request, reply) {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        await authService.revokeRefreshToken(token);
    }
    return reply.status(204).send();
}
export async function authRoutes(app) {
    app.post('/login', loginHandler);
    app.post('/refresh', refreshHandler);
    app.get('/me', { preHandler: [app.authenticate] }, meHandler);
    app.post('/logout', { preHandler: [app.authenticate] }, logoutHandler);
}
//# sourceMappingURL=auth.controller.js.map