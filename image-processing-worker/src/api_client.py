from __future__ import annotations

import httpx
from src.config import settings
from src.logger import logger
from src.models import ImageMetadata, ProcessingResult


class ApiClient:
    def __init__(self):
        self.base_url = settings.api_base_url.rstrip("/")
        self.jwt = settings.api_jwt
        self.api_key = settings.api_service_api_key
        self._provider_id: str | None = None

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.jwt:
            headers["Authorization"] = f"Bearer {self.jwt}"
        elif self.api_key:
            headers["X-Service-API-Key"] = self.api_key
        return headers

    async def update_image_status(
        self, image_id: str, status: str
    ) -> None:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.patch(
                f"{self.base_url}/api/v1/images/{image_id}/metadata",
                json={"status": status},
                headers=self._headers(),
            )
            if response.status_code not in (200, 204):
                logger.error(
                    "Failed to update image status",
                    image_id=image_id,
                    status=status,
                    status_code=response.status_code,
                    response=response.text,
                )
                response.raise_for_status()

    async def report_processing_result(
        self, result: ProcessingResult
    ) -> None:
        metadata = result.metadata

        files = [
            {
                "fileType": "raw",
                "fileSizeBytes": result.raw_size_bytes,
                "mimeType": "image/tiff",
                "objectKey": result.raw_object_key,
            },
            {
                "fileType": "processed",
                "fileSizeBytes": result.png_size_bytes,
                "mimeType": "image/png",
                "objectKey": result.png_object_key,
            },
            {
                "fileType": "thumbnail",
                "fileSizeBytes": result.thumbnail_size_bytes,
                "mimeType": "image/png",
                "objectKey": result.thumbnail_object_key,
            },
        ]
        if self._provider_id:
            for f in files:
                f["storageProviderId"] = self._provider_id

        payload = {
            "status": "completed",
            "widthPx": metadata.width_px,
            "heightPx": metadata.height_px,
            "bitDepth": metadata.bit_depth,
            "colorSpace": metadata.color_space,
            "compressionType": metadata.compression_type,
            "compressionRatio": metadata.compression_ratio,
            "checksumSha256": result.sha256,
            "processedAt": result.processed_at,
            "tiffMetadata": metadata.tiff_tags,
            "files": files,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/v1/images/{result.image_id}/result",
                json=payload,
                headers=self._headers(),
            )

            if response.status_code == 404:
                logger.error(
                    "Image not found in API",
                    image_id=result.image_id,
                )
                raise ValueError(f"Image {result.image_id} not found")

            if response.status_code not in (200, 204):
                logger.error(
                    "Failed to report processing result",
                    image_id=result.image_id,
                    status_code=response.status_code,
                    response=response.text,
                )
                response.raise_for_status()

        logger.info(
            "Processing result reported to API",
            image_id=result.image_id,
            width=metadata.width_px,
            height=metadata.height_px,
            files=len(payload["files"]),
        )

    async def report_error(
        self, image_id: str, stage: str, message: str, recoverable: bool
    ) -> None:
        payload = {
            "status": "failed" if not recoverable else "queued",
            "error_message": message,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                await client.patch(
                    f"{self.base_url}/api/v1/images/{image_id}/metadata",
                    json=payload,
                    headers=self._headers(),
                )
            except Exception as e:
                logger.warning(
                    "Failed to report error to API",
                    image_id=image_id,
                    error=str(e),
                )

    async def get_camera(self, camera_id: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/api/v1/cameras/{camera_id}",
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    async def get_default_storage_provider(self) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/api/v1/storage-providers/default",
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    async def report_file_upload(self, image_id: str, file_type: str, object_key: str, storage_provider_id: str, file_size_bytes: int, checksum_sha256: str | None = None, mime_type: str | None = None) -> dict:
        payload = {
            "imageId": image_id,
            "fileType": file_type,
            "objectKey": object_key,
            "storageProviderId": storage_provider_id,
            "fileSizeBytes": file_size_bytes,
            "checksumSha256": checksum_sha256,
            "mimeType": mime_type,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/v1/images/worker-upload",
                json=payload,
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/health",
                )
                return response.status_code == 200
        except Exception:
            return False
