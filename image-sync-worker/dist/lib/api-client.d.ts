import type { CameraConfig } from '../types/index.js';
export declare function fetchCameras(): Promise<CameraConfig[]>;
export declare function fetchCameraById(id: string): Promise<CameraConfig>;
export declare function registerImage(data: {
    cameraId: string;
    originalFilename: string;
    fileSizeBytes: number;
    checksumMd5: string;
    checksumSha256?: string;
}): Promise<{
    id: string;
}>;
export declare function updateCameraPoll(cameraId: string, stats?: {
    scanned: number;
    newFiles: number;
    errors: number;
}): Promise<void>;
export declare function reportError(cameraId: string, message: string, details?: Record<string, unknown>): Promise<void>;
export declare function checkApiHealth(): Promise<boolean>;
