import { UnauthorizedError } from '../lib/errors.js';
import { config } from '../config/index.js';
export async function authenticate(request, _reply) {
    // Service-to-service API key authentication
    const apiKey = request.headers['x-service-api-key'];
    const apiKeyStr = Array.isArray(apiKey) ? apiKey[0] : apiKey;
    if (apiKeyStr && config.serviceApiKey && apiKeyStr === config.serviceApiKey) {
        request.user = {
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
        const payload = request.user;
        if (!payload || !payload.id) {
            throw new UnauthorizedError('Invalid token payload');
        }
    }
    catch (err) {
        if (err instanceof UnauthorizedError) {
            throw err;
        }
        throw new UnauthorizedError('Invalid or expired token');
    }
}
//# sourceMappingURL=auth.js.map