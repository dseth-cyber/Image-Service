import SMB2 from '@marsaud/smb2';
import { logger } from './logger.js';
export class SmbClient {
    instance = null;
    camera;
    constructor(camera) {
        this.camera = camera;
    }
    async connect() {
        if (this.instance)
            return;
        return new Promise((resolve, reject) => {
            const client = new SMB2({
                share: this.camera.smbSharePath,
                domain: this.camera.smbDomain ?? 'WORKGROUP',
                username: this.camera.smbUsername,
                password: this.camera.smbPasswordEncrypted,
            });
            client.exists('/', (err) => {
                if (err) {
                    logger.error({ camera: this.camera.name, err }, 'SMB connection failed');
                    reject(err);
                    return;
                }
                this.instance = client;
                resolve();
            });
        });
    }
    async readdir(dirPath) {
        const client = await this.getInstance();
        return new Promise((resolve, reject) => {
            client.readdir(dirPath, (err, files) => {
                if (err) {
                    this.instance = null;
                    reject(err);
                    return;
                }
                resolve(files.filter((f) => f !== '.' && f !== '..'));
            });
        });
    }
    async stat(filePath) {
        const client = await this.getInstance();
        return new Promise((resolve, reject) => {
            client.stat(filePath, (err, stats) => {
                if (err) {
                    this.instance = null;
                    reject(err);
                    return;
                }
                resolve({
                    size: stats.size,
                    mtime: stats.mtime,
                    isDirectory: stats.isDirectory(),
                });
            });
        });
    }
    createReadStream(filePath) {
        if (!this.instance) {
            throw new Error('SMB client not connected. Call connect() first.');
        }
        return this.instance.createReadStream(filePath);
    }
    async close() {
        if (this.instance) {
            try {
                await new Promise((resolve) => {
                    this.instance.close(() => resolve());
                });
            }
            catch {
            }
            this.instance = null;
        }
    }
    async getInstance() {
        if (this.instance)
            return this.instance;
        await this.connect();
        if (!this.instance)
            throw new Error('Failed to establish SMB connection');
        return this.instance;
    }
}
export function buildSmbPath(camera, relativePath) {
    const base = camera.smbSharePath.endsWith('/')
        ? camera.smbSharePath.slice(0, -1)
        : camera.smbSharePath;
    const cleanRelative = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return `${base}/${cleanRelative}`;
}
//# sourceMappingURL=smb.js.map