import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockReaddir = vi.fn();

vi.mock('../src/lib/smb.js', async () => {
  const actual = await vi.importActual('../src/lib/smb.js');
  return {
    ...actual,
    SmbClient: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      readdir: mockReaddir,
      createReadStream: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

const SMB_FILE_ATTRIBUTE_DIRECTORY = 0x10;

function makeSmbFileEntry(
  filename: string,
  size: number,
  mtime: Date,
  isDirectory = false,
): import('../src/lib/smb.js').SmbFileEntry {
  return {
    Filename: filename,
    size,
    mtime,
    isDirectory,
  };
}

import { scanCameraDirectory } from '../src/lib/scanner.js';
import { SmbClient, smbRelativePath, jobFilePath, parseSmbSharePath, normalizeShareForSmb2, parseSmbFileStats } from '../src/lib/smb.js';
import type { CameraConfig } from '../src/types/index.js';

const mockCamera: CameraConfig = {
  id: 'cam-1',
  name: 'TestCamera',
  ipAddress: '192.168.1.100',
  smbSharePath: '//192.168.1.100/images',
  smbDomain: null,
  smbUsername: 'user',
  smbPasswordEncrypted: 'pass',
  smbSubdirectoryPattern: null,
  status: 'active',
  pollIntervalSeconds: 30,
  timezone: 'UTC',
  captureMode: 'periodic',
  retentionPolicyId: 'pol-1',
  enabled: true,
};

function makeMockSmb() {
  return new SmbClient(mockCamera);
}

describe('scanCameraDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return TIFF files from directory', async () => {
    mockReaddir.mockResolvedValue([
      makeSmbFileEntry('image_001.tiff', 1048576, new Date('2024-01-15T10:00:00Z')),
      makeSmbFileEntry('image_002.tiff', 2097152, new Date('2024-01-15T10:01:00Z')),
      makeSmbFileEntry('readme.txt', 512, new Date('2024-01-15T10:00:00Z')),
    ]);

    const smb = makeMockSmb();
    const files = await scanCameraDirectory(smb, mockCamera);

    expect(files).toHaveLength(2);
    expect(files[0].originalFilename).toBe('image_001.tiff');
    expect(files[1].originalFilename).toBe('image_002.tiff');
  });

  it('should skip non-TIFF files', async () => {
    mockReaddir.mockResolvedValue([
      makeSmbFileEntry('image_001.tiff', 1048576, new Date('2024-01-15T10:00:00Z')),
      makeSmbFileEntry('notes.txt', 512, new Date('2024-01-15T10:00:00Z')),
      makeSmbFileEntry('data.csv', 1024, new Date('2024-01-15T10:00:00Z')),
    ]);

    const smb = makeMockSmb();
    const files = await scanCameraDirectory(smb, mockCamera);

    expect(files).toHaveLength(1);
    expect(files[0].originalFilename).toBe('image_001.tiff');
  });

  it('should skip hidden files (dot prefix)', async () => {
    mockReaddir.mockResolvedValue([
      makeSmbFileEntry('.hidden.tiff', 1024, new Date('2024-01-15T10:00:00Z')),
      makeSmbFileEntry('visible.tiff', 2048, new Date('2024-01-15T10:00:00Z')),
      makeSmbFileEntry('~temp.tiff', 512, new Date('2024-01-15T10:00:00Z')),
    ]);

    const smb = makeMockSmb();
    const files = await scanCameraDirectory(smb, mockCamera);

    expect(files).toHaveLength(1);
    expect(files[0].originalFilename).toBe('visible.tiff');
  });

  it('should skip temp files', async () => {
    mockReaddir.mockResolvedValue([
      makeSmbFileEntry('image_001.tiff.tmp', 1024, new Date('2024-01-15T10:00:00Z')),
      makeSmbFileEntry('image_001.tiff.temp', 1024, new Date('2024-01-15T10:00:00Z')),
      makeSmbFileEntry('image_001.tiff', 2048, new Date('2024-01-15T10:00:00Z')),
    ]);

    const smb = makeMockSmb();
    const files = await scanCameraDirectory(smb, mockCamera);

    expect(files).toHaveLength(1);
    expect(files[0].originalFilename).toBe('image_001.tiff');
  });

  it('should skip directories', async () => {
    mockReaddir.mockResolvedValue([
      makeSmbFileEntry('subdir', 0, new Date('2024-01-15T10:00:00Z'), true),
      makeSmbFileEntry('image_001.tiff', 1048576, new Date('2024-01-15T10:00:00Z')),
    ]);

    const smb = makeMockSmb();
    const files = await scanCameraDirectory(smb, mockCamera);

    expect(files).toHaveLength(1);
    expect(files[0].originalFilename).toBe('image_001.tiff');
  });

  it('should skip files newer than stability window', async () => {
    const recent = new Date(Date.now() - 1000);
    const old = new Date(Date.now() - 60000);

    mockReaddir.mockResolvedValue([
      makeSmbFileEntry('recent.tiff', 1024, recent),
      makeSmbFileEntry('old.tiff', 2048, old),
    ]);

    const smb = makeMockSmb();
    const files = await scanCameraDirectory(smb, mockCamera);

    expect(files).toHaveLength(1);
    expect(files[0].originalFilename).toBe('old.tiff');
  });

  it('should populate SyncFile fields correctly', async () => {
    const mtime = new Date('2024-01-15T10:30:00Z');
    mockReaddir.mockResolvedValue([
      makeSmbFileEntry('test.tiff', 3145728, mtime),
    ]);

    const smb = makeMockSmb();
    const files = await scanCameraDirectory(smb, mockCamera);

    expect(files[0]).toEqual({
      cameraId: 'cam-1',
      relativePath: '\\',
      originalFilename: 'test.tiff',
      fileSizeBytes: 3145728,
      lastModified: mtime,
    });
  });

  it('should handle empty directory', async () => {
    mockReaddir.mockResolvedValue([]);

    const smb = makeMockSmb();
    const files = await scanCameraDirectory(smb, mockCamera);

    expect(files).toHaveLength(0);
  });

  it('should pass subdirectory pattern to readdir', async () => {
    const now = new Date();
    const y = now.getFullYear().toString();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const cameraWithSubdir = { ...mockCamera, smbSubdirectoryPattern: 'Camera1/{YYYY}/{MM}/{DD}' };
    mockReaddir.mockResolvedValue([
      makeSmbFileEntry('image.tiff', 1024, new Date('2024-01-15T10:00:00Z')),
    ]);

    const smb = makeMockSmb();
    const files = await scanCameraDirectory(smb, cameraWithSubdir);

    expect(files).toHaveLength(1);
    expect(mockReaddir).toHaveBeenCalledWith(`\\Camera1\\${y}\\${m}\\${d}`);
  });
});

describe('smbRelativePath', () => {
  it('should prefix backslash for bare filenames', () => {
    expect(smbRelativePath('file.tiff')).toBe('\\file.tiff');
  });

  it('should normalize leading slash', () => {
    expect(smbRelativePath('/file.tiff')).toBe('\\file.tiff');
  });

  it('should normalize leading backslash', () => {
    expect(smbRelativePath('\\file.tiff')).toBe('\\file.tiff');
  });

  it('should convert forward slashes to backslashes', () => {
    expect(smbRelativePath('dir/sub/file.tiff')).toBe('\\dir\\sub\\file.tiff');
  });

  it('should return backslash for empty string', () => {
    expect(smbRelativePath('')).toBe('\\');
  });

  it('should handle mixed path separators', () => {
    expect(smbRelativePath('dir1\\dir2/file.tiff')).toBe('\\dir1\\dir2\\file.tiff');
  });
});

describe('jobFilePath', () => {
  const cam: CameraConfig = {
    id: 'cam-1',
    name: 'Test',
    ipAddress: '10.0.0.1',
    smbSharePath: '//server/share',
    smbDomain: null,
    smbUsername: 'user',
    smbPasswordEncrypted: 'pass',
    smbSubdirectoryPattern: null,
    status: 'active',
    pollIntervalSeconds: 30,
    timezone: 'UTC',
    captureMode: 'periodic',
    retentionPolicyId: 'pol-1',
    enabled: true,
  };

  it('should build full job path', () => {
    expect(jobFilePath(cam, 'image.tiff')).toBe('//server/share/image.tiff');
  });

  it('should strip leading slash from filename', () => {
    expect(jobFilePath(cam, '/image.tiff')).toBe('//server/share/image.tiff');
  });

  it('should strip leading backslash from filename', () => {
    expect(jobFilePath(cam, '\\image.tiff')).toBe('//server/share/image.tiff');
  });

  it('should convert backslashes to forward slashes', () => {
    expect(jobFilePath(cam, 'dir\\image.tiff')).toBe('//server/share/dir/image.tiff');
  });
});

describe('parseSmbSharePath', () => {
  it('should parse valid share path', () => {
    const parsed = parseSmbSharePath('//server/share');
    expect(parsed).toEqual({ host: 'server', share: 'share' });
  });

  it('should parse share path with port', () => {
    const parsed = parseSmbSharePath('//192.168.1.100/images');
    expect(parsed).toEqual({ host: '192.168.1.100', share: 'images' });
  });

  it('should throw on invalid path', () => {
    expect(() => parseSmbSharePath('invalid')).toThrow();
  });
});

describe('normalizeShareForSmb2', () => {
  it('should convert //host/share to \\\\host\\share', () => {
    expect(normalizeShareForSmb2('//server/share')).toBe('\\\\server\\share');
  });

  it('should handle IP-based paths', () => {
    expect(normalizeShareForSmb2('//192.168.1.100/images')).toBe('\\\\192.168.1.100\\images');
  });
});

describe('parseSmbFileStats', () => {
  it('should return file stats from entry', () => {
    const mtime = new Date('2024-06-15T12:00:00Z');
    const entry = makeSmbFileEntry('test.tiff', 1048576, mtime);
    const stats = parseSmbFileStats(entry);
    expect(stats.size).toBe(1048576);
    expect(stats.mtime).toEqual(mtime);
    expect(stats.isDirectory).toBe(false);
  });

  it('should mark directory entries', () => {
    const entry = makeSmbFileEntry('subdir', 0, new Date(), true);
    const stats = parseSmbFileStats(entry);
    expect(stats.isDirectory).toBe(true);
  });
});
