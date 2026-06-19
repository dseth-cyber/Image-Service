import type { CameraConfig } from '../types/index.js';
export declare class SmbClient {
    private instance;
    private camera;
    constructor(camera: CameraConfig);
    connect(): Promise<void>;
    readdir(dirPath: string): Promise<string[]>;
    stat(filePath: string): Promise<{
        size: number;
        mtime: Date;
        isDirectory: boolean;
    }>;
    createReadStream(filePath: string): NodeJS.ReadableStream;
    close(): Promise<void>;
    private getInstance;
}
export declare function buildSmbPath(camera: CameraConfig, relativePath: string): string;
