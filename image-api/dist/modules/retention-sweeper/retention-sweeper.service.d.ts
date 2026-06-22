export declare function setRetentionUntil(imageId: string, cameraId: string): Promise<void>;
export declare function sweepExpiredImages(): Promise<{
    deleted: number;
    errors: number;
}>;
//# sourceMappingURL=retention-sweeper.service.d.ts.map