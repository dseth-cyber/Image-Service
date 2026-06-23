from __future__ import annotations

import asyncio
import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from src.logger import logger
from src.config import settings


class HealthState:
    def __init__(self):
        self.status: str = "starting"
        self.start_time: float = time.time()
        self.jobs_processed: int = 0
        self.jobs_failed: int = 0
        self.last_job_time: float | None = None
        self.redis_ok: bool = False
        self.minio_ok: bool = False
        self.api_ok: bool = False

    def to_dict(self) -> dict:
        uptime = int(time.time() - self.start_time)
        return {
            "service": "image-processing-worker",
            "status": self.status,
            "version": "1.0.0",
            "uptime": uptime,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "details": {
                "jobsProcessed": self.jobs_processed,
                "jobsFailed": self.jobs_failed,
                "lastJobTime": self.last_job_time,
                "checks": {
                    "redis": "ok" if self.redis_ok else "down",
                    "minio": "ok" if self.minio_ok else "down",
                    "api": "ok" if self.api_ok else "down",
                },
            },
        }


health_state = HealthState()


class HealthHandler(BaseHTTPRequestHandler):
    def _get_response(self) -> tuple[int, bytes]:
        body = json.dumps(health_state.to_dict()).encode()

        if self.path == "/health":
            status_code = 200 if health_state.status in ("ok", "degraded") else 503
        elif self.path == "/health/ready":
            ready = health_state.status not in ("starting", "down")
            status_code = 200 if ready else 503
            body = json.dumps({"ready": ready, "status": health_state.status}).encode()
        elif self.path == "/health/live":
            body = json.dumps({"alive": True}).encode()
            status_code = 200
        else:
            status_code = 404
            body = json.dumps({"error": "Not found"}).encode()
        return status_code, body

    def do_GET(self) -> None:
        status_code, body = self._get_response()
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_HEAD(self) -> None:
        status_code, body = self._get_response()
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()

    def log_message(self, format, *args):
        logger.debug("Health request", path=args[0] if args else "")


class HealthServer:
    def __init__(self):
        self.server: HTTPServer | None = None

    async def start(self) -> None:
        loop = asyncio.get_event_loop()
        self.server = HTTPServer(
            ("0.0.0.0", settings.health_port),
            HealthHandler,
        )
        await loop.run_in_executor(None, self.server.serve_forever)

    async def stop(self) -> None:
        if self.server:
            await asyncio.get_event_loop().run_in_executor(None, self.server.shutdown)
