import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { computeChecksum } from '../src/lib/checksum.js';

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

describe('computeChecksum', () => {
  it('should compute MD5 checksum correctly', async () => {
    const input = Buffer.from('hello world');
    const stream = bufferToStream(input);
    const checksum = await computeChecksum(stream, 'md5');
    expect(checksum).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3');
  });

  it('should compute SHA-256 checksum correctly', async () => {
    const input = Buffer.from('hello world');
    const stream = bufferToStream(input);
    const checksum = await computeChecksum(stream, 'sha256');
    expect(checksum).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    );
  });

  it('should handle empty buffer', async () => {
    const input = Buffer.alloc(0);
    const stream = bufferToStream(input);
    const checksum = await computeChecksum(stream, 'md5');
    expect(checksum).toBe('d41d8cd98f00b204e9800998ecf8427e');
  });

  it('should handle large buffer', async () => {
    const input = Buffer.alloc(10 * 1024 * 1024, 'A');
    const stream = bufferToStream(input);
    const checksum = await computeChecksum(stream, 'md5');
    expect(checksum).toHaveLength(32);
  });

  it('should reject on stream error', async () => {
    const stream = new Readable({
      read() {
        this.destroy(new Error('Stream error'));
      },
    });

    await expect(computeChecksum(stream, 'md5')).rejects.toThrow('Stream error');
  });
});
