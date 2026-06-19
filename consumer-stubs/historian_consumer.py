import asyncio
import json
import logging

from aiokafka import AIOKafkaConsumer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("historian-service")

BOOTSTRAP_SERVERS = "kafka:9092"
TOPIC = "image.processed"
GROUP_ID = "historian-service"


async def main() -> None:
    consumer = AIOKafkaConsumer(
        TOPIC,
        bootstrap_servers=BOOTSTRAP_SERVERS,
        group_id=GROUP_ID,
        auto_offset_reset="earliest",
    )

    await consumer.start()
    logger.info("Historian consumer started", extra={"topic": TOPIC, "group": GROUP_ID})

    try:
        async for msg in consumer:
            event = json.loads(msg.value)
            logger.info(
                "Received image.processed event",
                extra={
                    "imageId": event.get("imageId"),
                    "cameraId": event.get("cameraId"),
                    "filename": event.get("filename"),
                },
            )
    except asyncio.CancelledError:
        pass
    finally:
        await consumer.stop()
        logger.info("Historian consumer stopped")


if __name__ == "__main__":
    asyncio.run(main())
