from dataclasses import dataclass, field
from datetime import datetime, timezone


DEFAULT_ACCEPTED_EXTENSIONS = ["tif", "tiff", "ptif", "ptiff"]


@dataclass
class ProcessingConfig:
    """Resolved per-camera/template processing options.

    Values may arrive in the job payload (preferred) or be fetched from the
    camera config endpoint. Falls back to system defaults when absent.
    """

    convert_to_png: bool = True
    keep_smaller: bool = True
    generate_thumbnail: bool = True
    thumbnail_size: int = 512
    compression_quality: int = 85

    @classmethod
    def from_source(cls, data: dict | None) -> "ProcessingConfig":
        data = data or {}

        def b(key: str, default: bool) -> bool:
            v = data.get(key)
            return default if v is None else bool(v)

        def i(key: str, default: int) -> int:
            v = data.get(key)
            try:
                return default if v is None else int(v)
            except (TypeError, ValueError):
                return default

        return cls(
            convert_to_png=b("convertToPng", True),
            keep_smaller=b("keepSmaller", True),
            generate_thumbnail=b("generateThumbnail", True),
            thumbnail_size=i("thumbnailSize", 512),
            compression_quality=i("compressionQuality", 85),
        )


@dataclass
class ProcessingJob:
    image_id: str
    camera_id: str
    smb_path: str
    original_filename: str
    file_size_bytes: int
    checksum_md5: str = ""
    checksum_sha256: str | None = None
    captured_at: str | None = None
    # Optional inline processing options (if the producer chose to include them).
    options: dict | None = None

    @classmethod
    def from_dict(cls, data: dict) -> "ProcessingJob":
        # Processing options may be nested under "options"/"processing" or inline.
        options: dict | None = None
        for key in ("options", "processing", "processingOptions"):
            if isinstance(data.get(key), dict):
                options = data[key]
                break
        if options is None:
            inline = {
                k: data[k]
                for k in (
                    "convertToPng",
                    "keepSmaller",
                    "generateThumbnail",
                    "thumbnailSize",
                    "compressionQuality",
                )
                if k in data
            }
            options = inline or None

        return cls(
            image_id=data["imageId"],
            camera_id=data["cameraId"],
            smb_path=data["smbPath"],
            original_filename=data["originalFilename"],
            file_size_bytes=data["fileSizeBytes"],
            checksum_md5=data.get("checksumMd5", ""),
            checksum_sha256=data.get("checksumSha256"),
            captured_at=data.get("capturedAt"),
            options=options,
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
            "capturedAt": self.captured_at,
            "options": self.options,
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
class FileOutput:
    """A single file to upload + report (raw / processed / thumbnail)."""

    file_type: str          # "raw" | "processed" | "thumbnail"
    object_key: str
    mime_type: str
    data: bytes

    @property
    def size_bytes(self) -> int:
        return len(self.data)


@dataclass
class ProcessingResult:
    image_id: str
    original_filename: str
    sha256: str
    metadata: ImageMetadata
    files: list[FileOutput] = field(default_factory=list)
    processed_at: str = field(default_factory=lambda: datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z'))

    def file_of(self, file_type: str) -> FileOutput | None:
        for f in self.files:
            if f.file_type == file_type:
                return f
        return None


@dataclass
class ProcessingError:
    image_id: str
    stage: str
    message: str
    error_type: str
    recoverable: bool = True
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z'))
