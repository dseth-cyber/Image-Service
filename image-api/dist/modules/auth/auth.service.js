import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getPrisma } from '../../lib/prisma.js';
import { UnauthorizedError } from '../../lib/errors.js';
export async function login(input) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { username: input.username } });
    if (!user || !user.enabled) {
        throw new UnauthorizedError('Invalid username or password');
    }
    const valid = await bcrypt.compare(input.password, user.password);
    if (!valid) {
        throw new UnauthorizedError('Invalid username or password');
    }
    await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
    });
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
    };
}
export async function createRefreshToken(userId) {
    const prisma = getPrisma();
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
        data: { userId, token, expiresAt },
    });
    return token;
}
export async function verifyRefreshToken(input) {
    const prisma = getPrisma();
    const stored = await prisma.refreshToken.findUnique({ where: { token: input.refreshToken } });
    if (!stored || stored.revokedAt) {
        throw new UnauthorizedError('Invalid refresh token');
    }
    if (stored.expiresAt < new Date()) {
        throw new UnauthorizedError('Refresh token expired');
    }
    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.enabled) {
        throw new UnauthorizedError('User not found or disabled');
    }
    await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
    });
    return { id: user.id, username: user.username, email: user.email, role: user.role };
}
export async function revokeRefreshToken(token) {
    const prisma = getPrisma();
    await prisma.refreshToken.updateMany({
        where: { token, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}
//# sourceMappingURL=auth.service.js.map