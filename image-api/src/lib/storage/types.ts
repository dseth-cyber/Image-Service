import type { Readable } from 'stream';

export type ProviderType = 's3' | 'local';

export interface HealthResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface StatsResult {
  objectCount: number;
  usedBytes: number;
}

export interface S3Config {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  bucket: string;
  useSSL: boolean;
}

export interface LocalDiskConfig {
  basePath: string;
}

export type ProviderConfig = S3Config | LocalDiskConfig;

export interface StorageProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType;

  save(key: string, data: Buffer, contentType: string): Promise<string>;
  getStream(key: string): Promise<Readable>;
  getBuffer(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  deleteBatch(keys: string[]): Promise<void>;
  list(prefix?: string): AsyncGenerator<string>;
  exists(key: string): Promise<boolean>;
  health(): Promise<HealthResult>;
  stats(): Promise<StatsResult>;
}
