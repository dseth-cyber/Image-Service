import { logger } from './logger.js';
import { config } from '../config/index.js';
class ApiClientError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'ApiClientError';
    }
}
async function request(method, path, body) {
    const url = `${config.api.baseUrl}/api/v1${path}`;
    const headers = {
        'Content-Type': 'application/json',
    };
    if (config.api.jwt) {
        headers['Authorization'] = `Bearer ${config.api.jwt}`;
    }
    else if (config.api.serviceApiKey) {
        headers['X-Service-API-Key'] = config.api.serviceApiKey;
    }
    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        let errorBody = null;
        try {
            errorBody = await res.json();
        }
        catch {
            // ignore parse error
        }
        throw new ApiClientError(res.status, errorBody?.message ?? `API request failed: ${res.statusText}`);
    }
    if (res.status === 204) {
        return undefined;
    }
    return res.json();
}
export async function fetchCameras() {
    const cameras = await request('GET', '/cameras?enabled=true');
    return cameras.map(normalizeCamera);
}
export async function fetchCameraById(id) {
    const camera = await request('GET', `/cameras/${id}`);
    return normalizeCamera(camera);
}
export async function registerImage(data) {
    return request('POST', '/images', {
        ...data,
        status: 'pending',
        capturedAt: new Date().toISOString(),
    });
}
export async function updateCameraPoll(cameraId, stats) {
    await request('PATCH', `/cameras/${cameraId}`, {
        lastPolledAt: new Date().toISOString(),
        ...(stats ? { metadata: { lastPollStats: stats } } : {}),
    });
}
export async function reportError(cameraId, message, details) {
    try {
        await request('POST', '/alerts', {
            alertType: 'camera_offline',
            severity: 'warning',
            source: cameraId,
            title: `Sync worker error: ${message.slice(0, 200)}`,
            message,
            details: details ?? {},
        });
    }
    catch (err) {
        logger.error({ err, cameraId }, 'Failed to report error to API');
    }
}
export async function checkApiHealth() {
    try {
        await request('GET', '/health');
        return true;
    }
    catch {
        return false;
    }
}
function normalizeCamera(raw) {
    return {
        id: String(raw.id),
        name: String(raw.name),
        ipAddress: String(raw.ipAddress),
        smbSharePath: String(raw.smbSharePath),
        smbDomain: raw.smbDomain ? String(raw.smbDomain) : null,
        smbUsername: String(raw.smbUsername),
        smbPasswordEncrypted: String(raw.smbPasswordEncrypted),
        smbSubdirectoryPattern: raw.smbSubdirectoryPattern
            ? String(raw.smbSubdirectoryPattern)
            : null,
        status: String(raw.status),
        pollIntervalSeconds: Number(raw.pollIntervalSeconds),
        timezone: raw.timezone ? String(raw.timezone) : null,
        captureMode: String(raw.captureMode),
        retentionPolicyId: String(raw.retentionPolicyId),
        enabled: Boolean(raw.enabled),
    };
}
//# sourceMappingURL=api-client.js.map