import { execFile, spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import type { CameraConfig } from '../types/index.js';

/*
 * ──────────────────────────────────────────────
 *  Types
 * ──────────────────────────────────────────────
 */

export interface SmbFileEntry {
  Filename: string;
  size: number;
  mtime: Date;
  isDirectory: boolean;
}

export interface SmbFileStats {
  size: number;
  mtime: Date;
  isDirectory: boolean;
}

/*
 * ──────────────────────────────────────────────
 *  Path helpers
 * ──────────────────────────────────────────────
 */

const SHARE_REGEX = /^\/\/([^/]+)\/([^/]+)/;

export interface ParsedSmbShare {
  host: string;
  share: string;
}

export function parseSmbSharePath(smbSharePath: string): ParsedSmbShare {
  const m = smbSharePath.match(SHARE_REGEX);
  if (!m) {
    throw new Error(
      `Invalid SMB share path: "${smbSharePath}". Expected format: //host/share`,
    );
  }
  return { host: m[1], share: m[2] };
}

export function normalizeShareForSmb2(smbSharePath: string): string {
  const { host, share } = parseSmbSharePath(smbSharePath);
  return `\\\\${host}\\${share}`;
}

export function smbRelativePath(filename: string): string {
  const clean = filename.startsWith('/') || filename.startsWith('\\')
    ? filename.slice(1)
    : filename;
  return `\\${clean.replace(/\//g, '\\')}`;
}

export function jobFilePath(camera: CameraConfig, filename: string): string {
  const base = camera.smbSharePath.endsWith('/')
    ? camera.smbSharePath.slice(0, -1)
    : camera.smbSharePath;
  const clean = filename.replace(/^[\\/]+/, '');
  return `${base}/${clean.replace(/\\/g, '/')}`;
}

/*
 * ──────────────────────────────────────────────
 *  SMB file object helpers
 * ──────────────────────────────────────────────
 */

export function parseSmbFileStats(entry: SmbFileEntry): SmbFileStats {
  return {
    size: entry.size,
    mtime: entry.mtime,
    isDirectory: entry.isDirectory,
  };
}

/*
 * ──────────────────────────────────────────────
 *  smbclient CLI wrapper
 * ──────────────────────────────────────────────
 */

function buildSmbArgs(camera: CameraConfig, commands: string[]): string[] {
  const { host, share } = parseSmbSharePath(camera.smbSharePath);
  const unc = `//${host}/${share}`;
  const creds = `${camera.smbUsername}%${camera.smbPasswordEncrypted}`;
  const args = [unc, '-U', creds, '-c', commands.join(';')];
  if (camera.smbDomain) {
    args.push('-W', camera.smbDomain);
  }
  return args;
}

function runSmbClient(camera: CameraConfig, commands: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = buildSmbArgs(camera, commands);
    execFile('smbclient', args, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`smbclient failed: ${err.message}\nstderr: ${stderr}`));
        return;
      }
      resolve(stdout);
    });
  });
}

/*
 * ──────────────────────────────────────────────
 *  SmbClient
 * ──────────────────────────────────────────────
 */

export class SmbClient {
  private camera: CameraConfig;

  constructor(camera: CameraConfig) {
    this.camera = camera;
  }

  async connect(): Promise<void> {
    // verify connectivity
    await runSmbClient(this.camera, ['ls']);
  }

  async readdir(dirPath: string): Promise<SmbFileEntry[]> {
    // Convert backslashes to forward slashes and strip leading/trailing slashes
    let lsPath = dirPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    // Append /* to query folder contents; handle spaces in path
    const glob = lsPath ? `"${lsPath}/*"` : '*';
    const cmd = `ls ${glob}`;
    const stdout = await runSmbClient(this.camera, [cmd]);
    return parseLsOutput(stdout);
  }

  createReadStream(filePath: string): Readable {
    const { host, share } = parseSmbSharePath(this.camera.smbSharePath);
    const unc = `//${host}/${share}`;
    const creds = `${this.camera.smbUsername}%${this.camera.smbPasswordEncrypted}`;
    const prefix = `${unc}/`;
    const relativePath = filePath.startsWith(prefix)
      ? filePath.slice(prefix.length)
      : filePath.replace(/^[\\/]+/, '');
    const args = [unc, '-U', creds, '-c', `get "${relativePath}" -`];

    const child = spawn('smbclient', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!child.stdout) {
      const s = new Readable({ read() {} });
      process.nextTick(() => s.destroy(new Error('No stdout from smbclient')));
      return s;
    }

    child.stderr?.resume();

    const stream = child.stdout;
    const timeout = setTimeout(() => {
      stream.destroy(new Error('smbclient read timeout'));
      child.kill();
    }, 30000);
    stream.on('close', () => clearTimeout(timeout));
    stream.on('close', () => {
      if (stream.destroyed) return;
      stream.destroy();
    });

    return stream;
  }

  async close(): Promise<void> {
    // smbclient is stateless per call, nothing to close
  }
}

/*
 * ──────────────────────────────────────────────
 *  Parse smbclient ls output
 * ──────────────────────────────────────────────
 *
 * Example output:
 *   .                                   D        0  Thu Jun 18 09:29:25 2026
 *   ..                                  D        0  Thu Jun 18 10:35:37 2026
 *   test_small.tiff                     N   230564  Thu Jun 18 10:13:07 2026
 *
 *   1055762868 blocks of size 1024. 828648528 blocks available
 */

const LS_LINE_REGEX = /^\s*(.+?)\s+([DN])\s+(\d+)\s+(.+?)\s+(\d{4})$/;

function parseLsOutput(stdout: string): SmbFileEntry[] {
  const lines = stdout.split('\n');
  const entries: SmbFileEntry[] = [];

  for (const line of lines) {
    const m = line.match(LS_LINE_REGEX);
    if (!m) continue;
    const filename = m[1].trim();
    if (filename === '.' || filename === '..') continue;
    const typeChar = m[2];
    const size = parseInt(m[3], 10);
    const dateStr = `${m[4]} ${m[5]}`;
    const mtime = new Date(dateStr);
    entries.push({
      Filename: filename,
      size,
      mtime,
      isDirectory: typeChar === 'D',
    });
  }

  return entries;
}
