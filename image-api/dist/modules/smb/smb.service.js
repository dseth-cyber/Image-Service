import { execFile } from 'node:child_process';
export async function testConnection(params) {
    const { host, share } = parseSmbPath(params.smbSharePath);
    const unc = `//${host}/${share}`;
    const creds = `${params.smbUsername}%${params.smbPasswordEncrypted}`;
    const args = [unc, '-U', creds, '-c', 'ls'];
    if (params.smbDomain)
        args.push('-W', params.smbDomain);
    try {
        await runSmbClient(args);
        return { success: true, message: `Connected to ${unc}` };
    }
    catch (err) {
        const msg = err.message.includes('smbclient failed')
            ? err.message.replace('smbclient failed: ', '').split('\n')[0]
            : err.message;
        return { success: false, message: msg };
    }
}
export async function listShares(params) {
    const creds = `${params.smbUsername}%${params.smbPasswordEncrypted}`;
    const args = ['-L', `//${params.host}`, '-U', creds];
    if (params.smbDomain)
        args.push('-W', params.smbDomain);
    const stdout = await runSmbClient(args);
    const shares = [];
    for (const line of stdout.split('\n')) {
        const m = line.match(/^\s{0,}(\S+)\s{2,}(Disk|disk|Printer|printer|IPC)\s{0,}(.*)$/);
        if (m && m[2].toLowerCase() === 'disk') {
            shares.push({ name: m[1], description: m[3].trim() });
        }
    }
    return { shares };
}
export async function browseDirectory(params) {
    const { host, share } = parseSmbPath(params.smbSharePath);
    const unc = `//${host}/${share}`;
    const creds = `${params.smbUsername}%${params.smbPasswordEncrypted}`;
    const lsPath = params.path ? params.path.replace(/\\/g, '/').replace(/\/$/, '') : '';
    const args = [unc, '-U', creds, '-c', lsPath ? `ls "${lsPath}"` : 'ls'];
    if (params.smbDomain)
        args.push('-W', params.smbDomain);
    const stdout = await runSmbClient(args);
    const entries = [];
    for (const line of stdout.split('\n')) {
        const m = line.match(/^\s*(.+?)\s+([DN])\s+/);
        if (!m)
            continue;
        const name = m[1].trim();
        if (name === '.' || name === '..')
            continue;
        entries.push({ name, isDirectory: m[2] === 'D' });
    }
    return { entries, currentPath: params.path ?? '' };
}
function parseSmbPath(smbSharePath) {
    const m = smbSharePath.match(/^\/\/([^/]+)\/([^/]+)/);
    if (!m)
        throw new Error(`Invalid SMB path: "${smbSharePath}"`);
    return { host: m[1], share: m[2] };
}
function runSmbClient(args) {
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
//# sourceMappingURL=smb.service.js.map