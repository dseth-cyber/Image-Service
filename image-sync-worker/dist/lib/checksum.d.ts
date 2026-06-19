import type { Readable } from 'node:stream';
export declare function computeChecksum(stream: Readable, algorithm?: 'md5' | 'sha256'): Promise<string>;
export declare function computeFileChecksumFromPath(smb: {
    createReadStream: (path: string) => Readable;
}, filePath: string, algorithm?: 'md5' | 'sha256'): Promise<string>;
