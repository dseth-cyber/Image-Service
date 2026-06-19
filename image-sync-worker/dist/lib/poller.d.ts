import { Tracker } from './tracker.js';
import { JobProducer } from './producer.js';
import type { PollResult } from '../types/index.js';
export declare class CameraPoller {
    private tracker;
    private producer;
    constructor(tracker: Tracker, producer: JobProducer);
    pollAllCameras(): Promise<PollResult[]>;
    private pollSingleCamera;
    private shouldPoll;
    private buildResult;
}
export declare function resetCameraInterval(cameraId: string): void;
