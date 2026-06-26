from __future__ import annotations

import io
import os
import subprocess
from minio import Minio
from minio.error import S3Error
from src.config import settings
from src.logger import logger


class StorageClient:
    """Pluggable storage client — supports S3, Local, SMB, NFS."""

    def __init__(self):
        self._type: str = "s3"
        self._s3_client: Minio | None = None
        self._bucket: str = settings.minio_bucket
        self._local_base_path: str = ""
        self._smb_mount_path: str = ""
        self._nfs_mount_path: str = ""

        self._s3_client = Minio(
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )

    def configure_from_provider(self, provider: dict) -> None:
        config = provider.get("config", {})
        self._type = provider.get("type", "s3")

        if self._type in ("s3", "seaweedfs"):
            endpoint = config.get("endpoint", settings.minio_endpoint)
            port = config.get("port", 9000)
            endpoint_with_port = f"{endpoint}:{port}" if ":" not in endpoint else endpoint
            self._s3_client = Minio(
                endpoint=endpoint_with_port,
                access_key=config.get("accessKey", settings.minio_access_key),
                secret_key=config.get("secretKey", settings.minio_secret_key),
                secure=config.get("useSSL", False),
            )
            self._bucket = config.get("bucket", settings.minio_bucket)
            logger.info(
                "Storage client configured",
                type=self._type,
                endpoint=endpoint_with_port,
                bucket=self._bucket,
            )

        elif self._type == "local":
            self._local_base_path = config.get("basePath", "/data/images")
            os.makedirs(self._local_base_path, exist_ok=True)
            logger.info("Storage client configured", type="local", path=self._local_base_path)

        elif self._type == "smb":
            self._smb_mount_path = config.get("mountPath", "")
            logger.info("Storage client configured", type="smb", mount=self._smb_mount_path)

        elif self._type == "nfs":
            self._nfs_mount_path = config.get("mountPath", "")
            logger.info("Storage client configured", type="nfs", mount=self._nfs_mount_path)

    async def ensure_bucket(self) -> None:
        if self._type in ("s3", "seaweedfs") and self._s3_client:
            try:
                if not self._s3_client.bucket_exists(self._bucket):
                    self._s3_client.make_bucket(self._bucket)
                    logger.info("Created bucket", bucket=self._bucket)
            except S3Error as e:
                logger.error("Failed to ensure bucket", error=str(e))
                raise

    async def upload_file(self, object_key: str, data: bytes, content_type: str) -> str:
        if self._type in ("s3", "seaweedfs"):
            return await self._upload_s3(object_key, data, content_type)
        elif self._type == "local":
            return await self._upload_local(object_key, data)
        elif self._type in ("smb", "nfs"):
            return await self._upload_mount(object_key, data)
        else:
            raise ValueError(f"Unsupported storage type: {self._type}")

    async def _upload_s3(self, object_key: str, data: bytes, content_type: str) -> str:
        data_stream = io.BytesIO(data)
        self._s3_client.put_object(
            bucket_name=self._bucket,
            object_name=object_key,
            data=data_stream,
            length=len(data),
            content_type=content_type,
        )
        logger.debug("Uploaded to S3", bucket=self._bucket, key=object_key, size=len(data))
        return object_key

    async def _upload_local(self, object_key: str, data: bytes) -> str:
        file_path = os.path.join(self._local_base_path, object_key)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(data)
        logger.debug("Uploaded to local", path=file_path, size=len(data))
        return object_key

    async def _upload_mount(self, object_key: str, data: bytes) -> str:
        mount = self._smb_mount_path or self._nfs_mount_path
        if not mount:
            raise ValueError(f"Mount path not configured for {self._type}")
        file_path = os.path.join(mount, object_key)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(data)
        logger.debug("Uploaded to mount", type=self._type, path=file_path, size=len(data))
        return object_key

    async def upload_tiff(self, object_key: str, data: bytes) -> str:
        return await self.upload_file(object_key, data, "image/tiff")

    async def upload_png(self, object_key: str, data: bytes) -> str:
        return await self.upload_file(object_key, data, "image/png")

    async def upload_thumbnail(self, object_key: str, data: bytes) -> str:
        return await self.upload_file(object_key, data, "image/png")

    async def health_check(self) -> bool:
        try:
            if self._type in ("s3", "seaweedfs") and self._s3_client:
                self._s3_client.bucket_exists(self._bucket)
            elif self._type == "local":
                os.access(self._local_base_path, os.W_OK)
            elif self._type in ("smb", "nfs"):
                mount = self._smb_mount_path or self._nfs_mount_path
                os.access(mount, os.W_OK)
            return True
        except Exception:
            return False
