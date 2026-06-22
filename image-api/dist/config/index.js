export const config = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    host: process.env.HOST ?? '0.0.0.0',
    port: parseInt(process.env.PORT ?? '3002', 10),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    database: {
        url: 'postgresql://image_user:image_pass@localhost:5432/image_db',
    },
    jwt: {
        secret: process.env.JWT_SECRET ?? 'change-me',
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
    minio: {
        endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
        port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
        accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
        bucket: process.env.MINIO_BUCKET ?? 'image-service',
        useSSL: process.env.MINIO_USE_SSL === 'true',
    },
    encryptionKey: process.env.ENCRYPTION_KEY ?? 'change-me',
    serviceApiKey: process.env.SERVICE_API_KEY ?? '',
    notifications: {
        telegram: {
            botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
            chatId: process.env.TELEGRAM_CHAT_ID ?? '',
        },
        line: {
            accessToken: process.env.LINE_ACCESS_TOKEN ?? '',
        },
    },
};
//# sourceMappingURL=index.js.map