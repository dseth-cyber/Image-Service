import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import { logger } from './logger.js';

export async function computeChecksum(
  stream: Readable,
  algorithm: 'md5' | 'sha256' = 'md5',
): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash(algorithm);
    let streamError: Error | null = null;

    stream.on('error', (err) => {
      streamError = err;
      reject(err);
    });

    stream.on('data', (chunk: Buffer) => {
      hash.update(chunk);
    });

    stream.on('end', () => {
      if (streamError) return;
      const digest = hash.digest('hex');
      logger.debug({ algorithm, digest: digest.slice(0, 16) }, 'Checksum computed');
      resolve(digest);
    });
  });
}

export async function computeFileChecksumFromPath(
  smb: { createReadStream: (path: string) => Readable },
  filePath: string,
  algorithm: 'md5' | 'sha256' = 'md5',
): Promise<string> {
  const stream = smb.createReadStream(filePath);
  return computeChecksum(stream, algorithm);
}
