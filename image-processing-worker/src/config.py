from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    worker_id: str = "processing-1"
    log_level: str = "INFO"

    redis_host: str = "redis"
    redis_port: int = 6379
    redis_password: str | None = None

    api_base_url: str = "http://image-api:3001"
    api_jwt: str = ""
    api_service_api_key: str = ""

    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "image-service"
    minio_use_ssl: bool = False

    smb_mount_path: str = "/mnt/smb"

    processing_concurrency: int = 4
    png_compression_level: int = 6
    thumbnail_size: int = 512
    tiff_resolution_dpi: int = 300

    max_retries: int = 3
    retry_delay_seconds: int = 5

    kafka_bootstrap_servers: str = "kafka:9092"
    kafka_topic_image_processed: str = "image.processed"
    kafka_client_id: str = "image-processing-worker"

    health_port: int = 9200

    @property
    def redis_dsn(self) -> str:
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}"
        return f"redis://{self.redis_host}:{self.redis_port}"

    @property
    def minio_secure(self) -> bool:
        return self.minio_use_ssl

    @property
    def queue_base_name(self) -> str:
        return "image-processing"

    @property
    def queue_name(self) -> str:
        return f"bull:{self.queue_base_name}:wait"

    @property
    def in_progress_key(self) -> str:
        return f"bull:{self.queue_base_name}:active"

    @property
    def failed_key(self) -> str:
        return f"{self.queue_base_name}:failed"

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()
