export declare const config: {
    readonly nodeEnv: string;
    readonly host: string;
    readonly port: number;
    readonly logLevel: string;
    readonly database: {
        readonly url: string;
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
};
//# sourceMappingURL=index.d.ts.map