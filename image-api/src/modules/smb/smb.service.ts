import { execFile } from 'node:child_process';

interface SmbEntry {
  name: string;
  isDirectory: boolean;
}

export async function testConnection(params: {
  smbSharePath: string;
  smbUsername: string;
  smbPasswordEncrypted: string;
  smbDomain?: string;
}): Promise<{ success: boolean; message: string }> {
  const { host, share } = parseSmbPath(params.smbSharePath);
  const unc = `//${host}/${share}`;
  const creds = `${params.smbUsername}%${params.smbPasswordEncrypted}`;
  const args = [unc, '-U', creds, '-c', 'ls'];
  if (params.smbDomain) args.push('-W', params.smbDomain);

  try {
    await runSmbClient(args);
    return { success: true, message: `Connected to ${unc}` };
  } catch (err: any) {
    const msg = err.message.includes('smbclient failed')
      ? err.message.replace('smbclient failed: ', '').split('\n')[0]
      : err.message;
    return { success: false, message: msg };
  }
}

export async function listShares(params: {
  host: string;
  smbUsername: string;
  smbPasswordEncrypted: string;
  smbDomain?: string;
}): Promise<{ shares: Array<{ name: string; description: string }> }> {
  const creds = `${params.smbUsername}%${params.smbPasswordEncrypted}`;
  const args = ['-L', `//${params.host}`, '-U', creds];
  if (params.smbDomain) args.push('-W', params.smbDomain);

  const stdout = await runSmbClient(args);
  const shares: Array<{ name: string; description: string }> = [];

  for (const line of stdout.split('\n')) {
    const m = line.match(/^\s{2}(\S+)\s{2,}(disk|printer|IPC)\s{2,}(.+)$/);
    if (m && m[2] === 'disk') {
      shares.push({ name: m[1], description: m[3].trim() });
    }
  }

  return { shares };
}

export async function browseDirectory(params: {
  smbSharePath: string;
  smbUsername: string;
  smbPasswordEncrypted: string;
  smbDomain?: string;
  path?: string;
}): Promise<{ entries: SmbEntry[]; currentPath: string }> {
  const { host, share } = parseSmbPath(params.smbSharePath);
  const unc = `//${host}/${share}`;
  const creds = `${params.smbUsername}%${params.smbPasswordEncrypted}`;
  const lsPath = params.path ? params.path.replace(/\\/g, '/').replace(/\/$/, '') : '.';
  const args = [unc, '-U', creds, '-c', `ls "${lsPath}"`];
  if (params.smbDomain) args.push('-W', params.smbDomain);

  const stdout = await runSmbClient(args);
  const entries: SmbEntry[] = [];

  for (const line of stdout.split('\n')) {
    const m = line.match(/^\s*(.+?)\s+([DN])\s+/);
    if (!m) continue;
    const name = m[1].trim();
    if (name === '.' || name === '..') continue;
    entries.push({ name, isDirectory: m[2] === 'D' });
  }

  return { entries, currentPath: params.path ?? '' };
}

function parseSmbPath(smbSharePath: string): { host: string; share: string } {
  const m = smbSharePath.match(/^\/\/([^/]+)\/([^/]+)/);
  if (!m) throw new Error(`Invalid SMB path: "${smbSharePath}"`);
  return { host: m[1], share: m[2] };
}

function runSmbClient(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('smbclient', args, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`smbclient failed: ${err.message}\nstderr: ${stderr}`));
        return;
      }
      resolve(stdout);
    });
  });
}
