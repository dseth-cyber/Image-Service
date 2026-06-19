from __future__ import annotations

import json
from aiokafka import AIOKafkaProducer
from src.config import settings
from src.logger import logger


class KafkaEventProducer:
    def __init__(self):
        self._producer: AIOKafkaProducer | None = None

    async def start(self) -> None:
        self._producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            client_id=settings.kafka_client_id,
            max_request_size=1048576,
        )
        await self._producer.start()
        logger.info("Kafka producer started", bootstrap=settings.kafka_bootstrap_servers)

    async def emit_image_processed(
        self,
        image_id: str,
        camera_id: str,
        filename: str,
        png_object_key: str,
        thumbnail_object_key: str,
        captured_at: str,
    ) -> None:
        if self._producer is None:
            logger.warning("Kafka producer not started, skipping event")
            return

        event = {
            "event": "image.processed",
            "imageId": image_id,
            "cameraId": camera_id,
            "filename": filename,
            "pngPath": png_object_key,
            "thumbnailPath": thumbnail_object_key,
            "capturedAt": captured_at,
        }

        try:
            await self._producer.send_and_wait(
                settings.kafka_topic_image_processed,
                json.dumps(event).encode("utf-8"),
            )
            logger.info(
                "Kafka event emitted",
                topic=settings.kafka_topic_image_processed,
                image_id=image_id,
            )
        except Exception as e:
            logger.error(
                "Failed to emit Kafka event",
                topic=settings.kafka_topic_image_processed,
                image_id=image_id,
                error=str(e),
            )

    async def stop(self) -> None:
        if self._producer is not None:
            await self._producer.stop()
            logger.info("Kafka producer stopped")
