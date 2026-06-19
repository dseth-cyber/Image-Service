import { createHash } from 'node:crypto';
import { logger } from './logger.js';
export async function computeChecksum(stream, algorithm = 'md5') {
    return new Promise((resolve, reject) => {
        const hash = createHash(algorithm);
        let streamError = null;
        stream.on('error', (err) => {
            streamError = err;
            reject(err);
        });
        stream.on('data', (chunk) => {
            hash.update(chunk);
        });
        stream.on('end', () => {
            if (streamError)
                return;
            const digest = hash.digest('hex');
            logger.debug({ algorithm, digest: digest.slice(0, 16) }, 'Checksum computed');
            resolve(digest);
        });
    });
}
export async function computeFileChecksumFromPath(smb, filePath, algorithm = 'md5') {
    const stream = smb.createReadStream(filePath);
    return computeChecksum(stream, algorithm);
}
//# sourceMappingURL=checksum.js.map