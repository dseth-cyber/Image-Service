from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class ProcessingJob:
    image_id: str
    camera_id: str
    smb_path: str
    original_filename: str
    file_size_bytes: int
    checksum_md5: str
    checksum_sha256: str | None = None

    @classmethod
    def from_dict(cls, data: dict) -> "ProcessingJob":
        return cls(
            image_id=data["imageId"],
            camera_id=data["cameraId"],
            smb_path=data["smbPath"],
            original_filename=data["originalFilename"],
            file_size_bytes=data["fileSizeBytes"],
            checksum_md5=data["checksumMd5"],
            checksum_sha256=data.get("checksumSha256"),
        )

    def to_dict(self) -> dict:
        return {
            "imageId": self.image_id,
            "cameraId": self.camera_id,
            "smbPath": self.smb_path,
            "originalFilename": self.original_filename,
            "fileSizeBytes": self.file_size_bytes,
            "checksumMd5": self.checksum_md5,
            "checksumSha256": self.checksum_sha256,
        }


@dataclass
class ImageMetadata:
    width_px: int
    height_px: int
    bit_depth: int
    color_space: str
    compression_type: str
    compression_ratio: float | None = None
    num_frames: int = 1
    dpi: tuple[int, int] | None = None
    tiff_tags: dict = field(default_factory=dict)


@dataclass
class ProcessingResult:
    image_id: str
    original_filename: str
    png_size_bytes: int
    thumbnail_size_bytes: int
    raw_size_bytes: int
    sha256: str
    metadata: ImageMetadata
    raw_object_key: str
    png_object_key: str
    thumbnail_object_key: str
    processed_at: str = field(default_factory=lambda: datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z'))


@dataclass
class ProcessingError:
    image_id: str
    stage: str
    message: str
    error_type: str
    recoverable: bool = True
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z'))
