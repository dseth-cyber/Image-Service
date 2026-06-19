from __future__ import annotations

import io
from minio import Minio
from minio.error import S3Error
from src.config import settings
from src.logger import logger


class MinioClient:
    def __init__(self):
        self.client = Minio(
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        self.bucket = settings.minio_bucket

    async def ensure_bucket(self) -> None:
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
                logger.info("Created MinIO bucket", bucket=self.bucket)
        except S3Error as e:
            logger.error("Failed to ensure MinIO bucket", bucket=self.bucket, error=str(e))
            raise

    async def upload_file(
        self,
        object_key: str,
        data: bytes,
        content_type: str,
    ) -> str:
        try:
            data_stream = io.BytesIO(data)
            length = len(data)

            self.client.put_object(
                bucket_name=self.bucket,
                object_name=object_key,
                data=data_stream,
                length=length,
                content_type=content_type,
            )

            logger.debug(
                "Uploaded to MinIO",
                bucket=self.bucket,
                object_key=object_key,
                size_bytes=length,
                content_type=content_type,
            )

            return object_key
        except S3Error as e:
            logger.error(
                "MinIO upload failed",
                bucket=self.bucket,
                object_key=object_key,
                error=str(e),
            )
            raise

    async def upload_tiff(self, object_key: str, data: bytes) -> str:
        return await self.upload_file(object_key, data, "image/tiff")

    async def upload_png(self, object_key: str, data: bytes) -> str:
        return await self.upload_file(object_key, data, "image/png")

    async def upload_thumbnail(self, object_key: str, data: bytes) -> str:
        return await self.upload_file(object_key, data, "image/png")

    async def health_check(self) -> bool:
        try:
            self.client.bucket_exists(self.bucket)
            return True
        except S3Error:
            return False
