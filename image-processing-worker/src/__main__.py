from __future__ import annotations

import asyncio
import signal
from src.config import settings
from src.logger import setup_logging, logger
from src.worker import ProcessingWorker
from src.health import HealthServer, health_state
from src.minio_storage import MinioClient
from src.api_client import ApiClient


async def main() -> None:
    setup_logging()

    logger.info(
        "Starting image-processing-worker",
        worker_id=settings.worker_id,
        redis_host=settings.redis_host,
        api_url=settings.api_base_url,
        minio_endpoint=settings.minio_endpoint,
    )

    health_server = HealthServer()
    worker = ProcessingWorker()

    stop_event = asyncio.Event()

    def signal_handler():
        logger.info("Shutdown signal received")
        stop_event.set()

    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, signal_handler)
        except NotImplementedError:
            pass

    asyncio.create_task(check_dependencies())
    asyncio.create_task(health_server.start())
    asyncio.create_task(worker.start())

    await stop_event.wait()

    logger.info("Shutting down...")
    await worker.stop()
    await health_server.stop()
    logger.info("Shutdown complete")


async def check_dependencies() -> None:
    await asyncio.sleep(2)

    try:
        redis_ok = await _check_redis()
        health_state.redis_ok = redis_ok
    except Exception as e:
        logger.error("Redis health check failed", error=str(e))

    try:
        minio_client = MinioClient()
        minio_ok = await minio_client.health_check()
        health_state.minio_ok = minio_ok
    except Exception as e:
        logger.error("MinIO health check failed", error=str(e))

    try:
        api_client = ApiClient()
        api_ok = await api_client.health_check()
        health_state.api_ok = api_ok
    except Exception as e:
        logger.error("API health check failed", error=str(e))

    all_ok = health_state.redis_ok and health_state.minio_ok and health_state.api_ok
    health_state.status = "ok" if all_ok else "degraded"

    logger.info(
        "Dependency check complete",
        redis=health_state.redis_ok,
        minio=health_state.minio_ok,
        api=health_state.api_ok,
    )


async def _check_redis() -> bool:
    from redis.asyncio import Redis

    r = Redis.from_url(settings.redis_dsn)
    try:
        result = await r.ping()
        return result
    finally:
        await r.aclose()


if __name__ == "__main__":
    asyncio.run(main())
