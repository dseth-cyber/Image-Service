import http from 'node:http';
interface HealthState {
    status: 'starting' | 'ok' | 'degraded' | 'down';
    startTime: number;
    lastPollTime: number | null;
    lastPollDuration: number | null;
    camerasActive: number;
    camerasWithErrors: number;
    queueSize: number;
}
export declare function updateHealthState(partial: Partial<HealthState>): void;
export declare function startHealthServer(): http.Server;
export {};
