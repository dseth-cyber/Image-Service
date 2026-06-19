import { SmbClient, smbRelativePath } from './smb.js';
import type { SmbFileEntry } from './smb.js';
import { logger } from './logger.js';
import type { CameraConfig, SyncFile } from '../types/index.js';

const TIFF_EXTENSIONS = new Set(['.tiff', '.tif', '.ptiff', '.ptif']);

function isTiffFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return [...TIFF_EXTENSIONS].some((ext) => lower.endsWith(ext));
}

function shouldSkip(filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    lower.startsWith('.') ||
    lower.startsWith('~') ||
    lower.endsWith('.tmp') ||
    lower.endsWith('.temp')
  );
}

const STABILITY_WINDOW_MS = 5000;

export async function scanCameraDirectory(
  smb: SmbClient,
  camera: CameraConfig,
): Promise<SyncFile[]> {
  const discovered: SyncFile[] = [];
  const scanPath = camera.smbSubdirectoryPattern
    ? smbRelativePath(resolveSubdirectoryPattern(camera))
    : '\\';

  const entries: SmbFileEntry[] = await smb.readdir(scanPath);

  for (const entry of entries) {
    const filename = entry.Filename;

    if (shouldSkip(filename)) continue;
    if (!isTiffFile(filename)) continue;

    if (entry.isDirectory) continue;

    const ageMs = Date.now() - entry.mtime.getTime();
    if (ageMs < STABILITY_WINDOW_MS) {
      logger.debug({ camera: camera.name, file: filename }, 'File too recent, deferring');
      continue;
    }

    discovered.push({
      cameraId: camera.id,
      relativePath: scanPath,
      originalFilename: filename,
      fileSizeBytes: entry.size,
      lastModified: entry.mtime,
    });
  }

  return discovered;
}

function resolveSubdirectoryPattern(camera: CameraConfig): string {
  if (!camera.smbSubdirectoryPattern) return '';
  const now = new Date();
  return camera.smbSubdirectoryPattern
    .replace('{YYYY}', now.getFullYear().toString())
    .replace('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
    .replace('{DD}', String(now.getDate()).padStart(2, '0'))
    .replace('{HH}', String(now.getHours()).padStart(2, '0'));
}
