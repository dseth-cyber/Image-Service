export interface CameraConfig {
    id: string;
    name: string;
    ipAddress: string;
    smbSharePath: string;
    smbDomain: string | null;
    smbUsername: string;
    smbPasswordEncrypted: string;
    smbSubdirectoryPattern: string | null;
    status: string;
    pollIntervalSeconds: number;
    timezone: string | null;
    captureMode: string;
    retentionPolicyId: string;
    enabled: boolean;
}
export interface SyncFile {
    cameraId: string;
    relativePath: string;
    originalFilename: string;
    fileSizeBytes: number;
    lastModified: Date;
    checksumMd5?: string;
    checksumSha256?: string;
}
export interface ProcessingJobPayload {
    imageId: string;
    cameraId: string;
    smbPath: string;
    originalFilename: string;
    fileSizeBytes: number;
    checksumMd5: string;
    checksumSha256?: string;
}
export interface JobEnqueueResult {
    imageId: string;
    jobId: string;
}
export interface PollResult {
    cameraId: string;
    cameraName: string;
    scanned: number;
    newFiles: number;
    duplicates: number;
    errors: number;
    durationMs: number;
}
