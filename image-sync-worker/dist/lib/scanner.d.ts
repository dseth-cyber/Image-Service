import { SmbClient } from './smb.js';
import type { CameraConfig, SyncFile } from '../types/index.js';
export declare function scanCameraDirectory(smb: SmbClient, camera: CameraConfig): Promise<SyncFile[]>;
