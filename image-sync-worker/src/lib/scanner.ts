import { SmbClient, smbRelativePath } from './smb.js';
import type { SmbFileEntry } from './smb.js';
import { logger } from './logger.js';
import { config } from '../config/index.js';
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
  const maxDepth = config.scanner.maxDepth;
  const rootPath = camera.smbSubdirectoryPattern
    ? smbRelativePath(resolveSubdirectoryPattern(camera))
    : '\\';
  return scanRecursive(smb, camera, rootPath, 0, maxDepth);
}

async function scanRecursive(
  smb: SmbClient,
  camera: CameraConfig,
  dirPath: string,
  depth: number,
  maxDepth: number,
): Promise<SyncFile[]> {
  if (depth > maxDepth) {
    logger.warn({ camera: camera.name, dirPath, depth }, 'Max scan depth reached');
    return [];
  }

  const discovered: SyncFile[] = [];
  const entries: SmbFileEntry[] = await smb.readdir(dirPath);
  logger.info({ camera: camera.name, dirPath, entryCount: entries.length }, 'readdir result');

  for (const entry of entries) {
    const filename = entry.Filename;
    logger.debug({ camera: camera.name, filename, isDir: entry.isDirectory, size: entry.size }, 'entry');
    if (shouldSkip(filename)) continue;

    if (entry.isDirectory) {
      if (depth < maxDepth) {
        const subPath = dirPath === '\\'
          ? `\\${filename}`
          : `${dirPath}\\${filename}`;
        const subResults = await scanRecursive(smb, camera, subPath, depth + 1, maxDepth);
        discovered.push(...subResults);
      }
      continue;
    }

    if (!isTiffFile(filename)) continue;

    const ageMs = Date.now() - entry.mtime.getTime();
    if (ageMs < STABILITY_WINDOW_MS) {
      logger.debug({ camera: camera.name, file: filename }, 'File too recent, deferring');
      continue;
    }

    const relativePath = dirPath === '\\' ? '' : dirPath;
    const originalFilename = relativePath
      ? `${relativePath}\\${filename}`
      : filename;

    discovered.push({
      cameraId: camera.id,
      relativePath: dirPath,
      originalFilename,
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
