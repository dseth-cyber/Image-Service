import { Client } from 'minio';
import { config } from '../config/index.js';

let client: Client | null = null;

export function getMinio(): Client {
  if (!client) {
    client = new Client({
      endPoint: config.minio.endpoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    });
  }
  return client;
}
