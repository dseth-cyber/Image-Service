import http from 'node:http';
import { logger } from './lib/logger.js';
import { config } from './config/index.js';

interface HealthState {
  status: 'starting' | 'ok' | 'degraded' | 'down';
  startTime: number;
  lastPollTime: number | null;
  lastPollDuration: number | null;
  camerasActive: number;
  camerasWithErrors: number;
  queueSize: number;
}

const state: HealthState = {
  status: 'starting',
  startTime: Date.now(),
  lastPollTime: null,
  lastPollDuration: null,
  camerasActive: 0,
  camerasWithErrors: 0,
  queueSize: 0,
};

export function updateHealthState(partial: Partial<HealthState>): void {
  Object.assign(state, partial);
}

export function startHealthServer(): http.Server {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/health') {
      const statusCode = state.status === 'ok' ? 200 : state.status === 'degraded' ? 200 : 503;
      res.writeHead(statusCode);
      res.end(JSON.stringify({
        service: 'image-sync-worker',
        status: state.status,
        version: '1.0.0',
        uptime: Math.floor((Date.now() - state.startTime) / 1000),
        timestamp: new Date().toISOString(),
        details: {
          lastPollTime: state.lastPollTime,
          lastPollDurationMs: state.lastPollDuration,
          camerasActive: state.camerasActive,
          camerasWithErrors: state.camerasWithErrors,
          queueSize: state.queueSize,
        },
      }));
    } else if (req.url === '/health/ready') {
      const ready = state.status !== 'starting' && state.status !== 'down';
      res.writeHead(ready ? 200 : 503);
      res.end(JSON.stringify({ ready, status: state.status }));
    } else if (req.url === '/health/live') {
      res.writeHead(200);
      res.end(JSON.stringify({ alive: true }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(config.health.port, () => {
    logger.info({ port: config.health.port }, 'Health server started');
  });

  server.on('error', (err) => {
    logger.error({ err }, 'Health server failed');
  });

  return server;
}
