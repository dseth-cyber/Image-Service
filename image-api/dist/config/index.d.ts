export declare const config: {
    readonly nodeEnv: string;
    readonly host: string;
    readonly port: number;
    readonly logLevel: string;
    readonly database: {
        readonly url: "postgresql://image_user:image_pass@localhost:5432/image_db";
    };
    readonly jwt: {
        readonly secret: string;
        readonly accessExpiresIn: string;
        readonly refreshExpiresIn: string;
    };
    readonly minio: {
        readonly endpoint: string;
        readonly port: number;
        readonly accessKey: string;
        readonly secretKey: string;
        readonly bucket: string;
        readonly useSSL: boolean;
    };
    readonly encryptionKey: string;
    readonly serviceApiKey: string;
    readonly notifications: {
        readonly telegram: {
            readonly botToken: string;
            readonly chatId: string;
        };
        readonly line: {
            readonly accessToken: string;
        };
    };
};
//# sourceMappingURL=index.d.ts.map