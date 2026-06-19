import { buildSmbPath } from './smb.js';
import { logger } from './logger.js';
const TIFF_EXTENSIONS = new Set(['.tiff', '.tif', '.ptiff', '.ptif']);
function isTiffFile(filename) {
    const lower = filename.toLowerCase();
    return [...TIFF_EXTENSIONS].some((ext) => lower.endsWith(ext));
}
function shouldSkip(filename) {
    const lower = filename.toLowerCase();
    return (lower.startsWith('.') ||
        lower.startsWith('~') ||
        lower.endsWith('.tmp') ||
        lower.endsWith('.temp'));
}
const STABILITY_WINDOW_MS = 5000;
export async function scanCameraDirectory(smb, camera) {
    const discovered = [];
    const scanPath = camera.smbSubdirectoryPattern
        ? buildSmbPath(camera, resolveSubdirectoryPattern(camera))
        : camera.smbSharePath;
    const entries = await smb.readdir(scanPath);
    for (const entry of entries) {
        if (shouldSkip(entry))
            continue;
        if (!isTiffFile(entry)) {
            continue;
        }
        const fullPath = `${scanPath}/${entry}`;
        try {
            const stats = await smb.stat(fullPath);
            if (stats.isDirectory)
                continue;
            const ageMs = Date.now() - stats.mtime.getTime();
            if (ageMs < STABILITY_WINDOW_MS) {
                logger.debug({ camera: camera.name, file: entry }, 'File too recent, deferring');
                continue;
            }
            discovered.push({
                cameraId: camera.id,
                relativePath: scanPath,
                originalFilename: entry,
                fileSizeBytes: stats.size,
                lastModified: stats.mtime,
            });
        }
        catch (err) {
            logger.warn({ camera: camera.name, file: entry, err }, 'Failed to stat file, skipping');
        }
    }
    return discovered;
}
function resolveSubdirectoryPattern(camera) {
    if (!camera.smbSubdirectoryPattern)
        return '';
    const now = new Date();
    return camera.smbSubdirectoryPattern
        .replace('{YYYY}', now.getFullYear().toString())
        .replace('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
        .replace('{DD}', String(now.getDate()).padStart(2, '0'))
        .replace('{HH}', String(now.getHours()).padStart(2, '0'));
}
//# sourceMappingURL=scanner.js.map