import { Client } from 'minio';
import type { Readable } from 'stream';
import type { StorageProvider, S3Config, HealthResult, StatsResult } from './types.js';

export class S3Provider implements StorageProvider {
  readonly id: string;
  readonly name: string;
  readonly type = 's3' as const;
  private client: Client;
  private config: S3Config;

  constructor(id: string, name: string, config: S3Config) {
    this.id = id;
    this.name = name;
    this.config = config;
    this.client = new Client({
      endPoint: config.endpoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
  }

  async save(key: string, data: Buffer, contentType: string): Promise<string> {
    await this.client.putObject(this.config.bucket, key, data, data.length, { 'Content-Type': contentType });
    return key;
  }

  async getStream(key: string): Promise<Readable> {
    return this.client.getObject(this.config.bucket, key);
  }

  async getBuffer(key: string): Promise<Buffer> {
    const stream = await this.getStream(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.config.bucket, key);
  }

  async deleteBatch(keys: string[]): Promise<void> {
    await this.client.removeObjects(this.config.bucket, keys);
  }

  async *list(prefix = ''): AsyncGenerator<string> {
    const stream = this.client.listObjects(this.config.bucket, prefix, true);
    for await (const obj of stream) {
      if (obj.name) yield obj.name;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.statObject(this.config.bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  async health(): Promise<HealthResult> {
    const start = Date.now();
    try {
      await this.client.bucketExists(this.config.bucket);
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { ok: false, latencyMs: Date.now() - start, error: err.message };
    }
  }

  async stats(): Promise<StatsResult> {
    let objectCount = 0;
    let usedBytes = 0;
    const stream = this.client.listObjects(this.config.bucket, '', true);
    for await (const obj of stream) {
      objectCount++;
      usedBytes += Number((obj as any).size ?? 0);
    }
    return { objectCount, usedBytes };
  }
}
