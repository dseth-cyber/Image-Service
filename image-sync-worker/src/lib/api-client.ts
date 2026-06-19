import { logger } from './logger.js';
import { config } from '../config/index.js';
import type { CameraConfig } from '../types/index.js';

interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${config.api.baseUrl}/api/v1${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.api.jwt) {
    headers['Authorization'] = `Bearer ${config.api.jwt}`;
  } else if (config.api.serviceApiKey) {
    headers['X-Service-API-Key'] = config.api.serviceApiKey;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorBody: ApiError | null = null;
    try {
      errorBody = await res.json() as ApiError;
    } catch {
      // ignore parse error
    }
    throw new ApiClientError(
      res.status,
      errorBody?.message ?? `API request failed: ${res.statusText}`,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function fetchCameras(): Promise<CameraConfig[]> {
  const cameras = await request<Array<Record<string, unknown>>>('GET', '/cameras?enabled=true');
  return cameras.map(normalizeCamera);
}

export async function fetchCameraById(id: string): Promise<CameraConfig> {
  const camera = await request<Record<string, unknown>>('GET', `/cameras/${id}`);
  return normalizeCamera(camera);
}

export async function findImageByChecksum(
  checksum: string,
  algorithm: 'md5' | 'sha256' = 'sha256',
): Promise<{ id: string } | null> {
  try {
    const field = algorithm === 'sha256' ? 'checksumSha256' : 'checksumMd5';
    const result = await request<{ data: Array<{ id: string }> }>('GET', `/images?${field}=${checksum}&limit=1`);
    return result.data.length > 0 ? result.data[0] : null;
  } catch {
    return null;
  }
}

export async function registerImage(data: {
  cameraId: string;
  originalFilename: string;
  fileSizeBytes: number;
  checksumMd5?: string;
  checksumSha256?: string;
}): Promise<{ id: string }> {
  return request<{ id: string }>('POST', '/images', {
    ...data,
    status: 'pending',
    capturedAt: new Date().toISOString(),
  });
}

export async function updateCameraPoll(
  cameraId: string,
  stats?: { scanned: number; newFiles: number; errors: number },
): Promise<void> {
  await request('PATCH', `/cameras/${cameraId}`, {
    lastPolledAt: new Date().toISOString(),
    ...(stats ? { metadata: { lastPollStats: stats } } : {}),
  });
}

export async function reportError(
  cameraId: string,
  message: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await request('POST', '/alerts', {
      alertType: 'camera_offline',
      severity: 'warning',
      source: cameraId,
      title: `Sync worker error: ${message.slice(0, 200)}`,
      message,
      details: details ?? {},
    });
  } catch (err) {
    logger.error({ err, cameraId }, 'Failed to report error to API');
  }
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    await request<unknown>('GET', '/health');
    return true;
  } catch {
    return false;
  }
}

function normalizeCamera(raw: Record<string, unknown>): CameraConfig {
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
