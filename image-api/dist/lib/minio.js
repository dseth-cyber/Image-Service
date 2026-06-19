import { Client } from 'minio';
import { config } from '../config/index.js';
let client = null;
export function getMinio() {
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
//# sourceMappingURL=minio.js.map