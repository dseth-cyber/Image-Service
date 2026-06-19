export declare const config: {
    readonly nodeEnv: string;
    readonly logLevel: string;
    readonly api: {
        readonly baseUrl: string;
        readonly jwt: string;
        readonly serviceApiKey: string;
    };
    readonly redis: {
        readonly host: string;
        readonly port: number;
        readonly password: string | undefined;
    };
    readonly polling: {
        readonly intervalMs: number;
        readonly concurrency: number;
    };
    readonly checksum: {
        readonly algorithm: "md5" | "sha256";
    };
    readonly tracker: {
        readonly processedTtlDays: number;
    };
    readonly retry: {
        readonly maxRetries: number;
        readonly initialDelayMs: number;
        readonly maxDelayMs: number;
    };
    readonly health: {
        readonly port: number;
    };
};
