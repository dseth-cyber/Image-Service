from __future__ import annotations

import asyncio
import json
import os
import subprocess
import tempfile
from redis.asyncio import Redis
from src.config import settings
from src.logger import logger
from src.models import ProcessingJob
from src.processor import process_tiff, ProcessingError
from src.minio_storage import MinioClient
from src.api_client import ApiClient
from src.kafka import KafkaEventProducer


class ProcessingWorker:
    def __init__(self):
        self._redis: Redis | None = None
        self.minio = MinioClient()
        self.api = ApiClient()
        self.kafka = KafkaEventProducer()
        self._running = True

    @property
    def redis(self) -> Redis:
        if self._redis is None:
            self._redis = Redis.from_url(
                settings.redis_dsn,
                decode_responses=True,
                socket_timeout=None,
            )
        return self._redis

    async def _reconnect_redis(self) -> None:
        try:
            await self._redis.aclose()
        except Exception:
            pass
        self._redis = None

    async def start(self) -> None:
        logger.info(
            "Starting processing worker",
            worker_id=settings.worker_id,
            queue=settings.queue_name,
            concurrency=settings.processing_concurrency,
        )

        await self.minio.ensure_bucket()
        try:
            await self.kafka.start()
        except Exception as e:
            logger.warning("Kafka not available — continuing without event emission", error=str(e))

        semaphore = asyncio.Semaphore(settings.processing_concurrency)

        while self._running:
            try:
                job_id = await self.redis.blmove(
                    settings.queue_name,
                    settings.in_progress_key,
                    timeout=30,
                )

                if not self._running:
                    break

                if job_id is None:
                    continue

                asyncio.create_task(
                    self._process_with_semaphore(semaphore, job_id)
                )

            except asyncio.CancelledError:
                break
            except (ConnectionError, OSError) as e:
                logger.error("Redis connection lost", error=str(e))
                await self._reconnect_redis()
                await asyncio.sleep(1)
            except Exception as e:
                logger.error("Worker loop error", error=str(e))
                await asyncio.sleep(1)

        await self._drain()

    async def stop(self) -> None:
        logger.info("Stopping worker...")
        self._running = False
        await self.kafka.stop()
        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None

    async def _process_with_semaphore(
        self, semaphore: asyncio.Semaphore, job_id: str
    ) -> None:
        async with semaphore:
            await self._process_job(job_id)

    async def _fetch_job_data(self, job_id: str) -> dict | None:
        job_hash_key = f"bull:{settings.queue_base_name}:{job_id}"
        raw = await self.redis.hgetall(job_hash_key)
        if not raw:
            logger.error("Job data not found in Redis", job_id=job_id)
            return None
        try:
            data_str = raw.get("data")
            if not data_str:
                logger.error("BullMQ job missing data field", job_id=job_id)
                return None
            return json.loads(data_str)
        except json.JSONDecodeError as e:
            logger.error("Invalid BullMQ job data JSON", job_id=job_id, error=str(e))
            return None

    async def _process_job(self, job_id: str) -> None:
        job_data = await self._fetch_job_data(job_id)
        if job_data is None:
            await self._remove_from_progress(job_id)
            return

        try:
            job = ProcessingJob.from_dict(job_data)
        except KeyError as e:
            logger.error("Job data missing required field", job_id=job_id, error=str(e))
            await self._remove_from_progress(job_id)
            return

        logger.info(
            "Processing job started",
            image_id=job.image_id,
            camera_id=job.camera_id,
            filename=job.original_filename,
        )

        try:
            await self.api.update_image_status(job.image_id, "processing")

            local_path = await self._resolve_file(job)

            try:
                result, png_data, thumb_data = process_tiff(
                    filepath=local_path,
                    image_id=job.image_id,
                    original_filename=job.original_filename,
                    camera_id=job.camera_id,
                )
            finally:
                if job.smb_share_path and os.path.exists(local_path):
                    os.unlink(local_path)

            await self.minio.upload_tiff(result.raw_object_key, b"")
            await self.minio.upload_png(result.png_object_key, png_data)
            await self.minio.upload_thumbnail(
                result.thumbnail_object_key, thumb_data
            )

            await self.api.report_processing_result(result)

            await self.kafka.emit_image_processed(
                image_id=job.image_id,
                camera_id=job.camera_id,
                filename=job.original_filename,
                png_object_key=result.png_object_key,
                thumbnail_object_key=result.thumbnail_object_key,
                captured_at=job.captured_at or result.processed_at,
            )

            await self._remove_from_progress(job_id)

            logger.info(
                "Job completed successfully",
                image_id=job.image_id,
                duration_ms=0,
                png_size=result.png_size_bytes,
                thumbnail_size=result.thumbnail_size_bytes,
            )

        except ProcessingError as e:
            logger.error(
                "Processing error",
                image_id=job.image_id,
                stage=e.stage,
                error=str(e),
                recoverable=e.recoverable,
            )

            if e.recoverable and self._should_retry(job):
                await self._requeue(job, job_id)
            else:
                await self._fail(job, job_id, str(e), e.stage)

        except Exception as e:
            logger.error(
                "Unexpected error processing job",
                image_id=job.image_id,
                error=str(e),
            )
            await self._fail(job, job_id, str(e), "unknown")

    async def _resolve_file(self, job: ProcessingJob) -> str:
        if job.smb_share_path:
            share = job.smb_share_path.rstrip("/")
            relative = job.smb_path[len(share):].lstrip("/")
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".tif")
            tmp.close()
            creds = f"{job.smb_username}%{job.smb_password}"
            cmd = ["smbclient", share, "-U", creds]
            if job.smb_domain:
                cmd.extend(["-W", job.smb_domain])
            cmd.extend(["-c", f'get "{relative}" "{tmp.name}"'])
            try:
                subprocess.run(cmd, check=True, capture_output=True, timeout=120)
            except subprocess.CalledProcessError as e:
                os.unlink(tmp.name)
                stderr = (e.stderr or b"").decode(errors="replace").strip()
                raise ProcessingError(
                    f"SMB download failed: {stderr or e}",
                    stage="file_access",
                    recoverable=True,
                )
            except (OSError, subprocess.TimeoutExpired) as e:
                if os.path.exists(tmp.name):
                    os.unlink(tmp.name)
                raise ProcessingError(
                    f"SMB download error: {e}",
                    stage="file_access",
                    recoverable=True,
                )
            return tmp.name

        mount = settings.smb_mount_path.rstrip("/")
        cleaned = job.smb_path.replace("\\", "/")
        if cleaned.startswith("//"):
            parts = cleaned.split("/")
            if len(parts) >= 4:
                host = parts[2]
                share = parts[3]
                subpath = "/".join(parts[4:])
                local = f"{mount}/{host}/{share}/{subpath}"
                if not os.path.exists(local):
                    raise ProcessingError(
                        f"File not found: {local}",
                        stage="file_access",
                        recoverable=False,
                    )
                return local

        raise ProcessingError(
            f"Cannot resolve file path: {job.smb_path}",
            stage="file_access",
            recoverable=False,
        )

    def _should_retry(self, job: ProcessingJob) -> bool:
        retry_count = getattr(job, "_retry_count", 0)
        return retry_count < settings.max_retries

    async def _requeue(self, job: ProcessingJob, job_id: str) -> None:
        retry_count = getattr(job, "_retry_count", 0) + 1
        job._retry_count = retry_count

        await asyncio.sleep(settings.retry_delay_seconds * retry_count)

        await self.redis.lpush(settings.queue_name, job_id)

        await self._remove_from_progress(job_id)

        logger.info(
            "Job requeued for retry",
            image_id=job.image_id,
            attempt=retry_count,
            max_retries=settings.max_retries,
        )

    async def _fail(self, job: ProcessingJob, job_id: str, error: str, stage: str) -> None:
        await self.api.report_error(job.image_id, stage, error, recoverable=False)

        await self.redis.lpush(
            settings.failed_key,
            json.dumps({
                "job": job.to_dict(),
                "error": error,
                "stage": stage,
                "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
            }),
        )

        await self._remove_from_progress(job_id)

        logger.error(
            "Job moved to dead letter",
            image_id=job.image_id,
            stage=stage,
            error=error,
        )

    async def _remove_from_progress(self, job_id: str) -> None:
        try:
            await self.redis.lrem(settings.in_progress_key, 1, job_id)
        except Exception as e:
            logger.warning("Failed to remove from in-progress", error=str(e))

    async def _drain(self) -> None:
        try:
            await self.redis.aclose()
        except Exception:
            pass
