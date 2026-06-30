from __future__ import annotations

import io
import os
from datetime import datetime, timezone
from PIL import Image, ImageSequence, TiffImagePlugin
import numpy as np
from src.validator import (
    validate_source_image,
    validate_dimensions,
)
from src.checksum import compute_sha256_bytes
from src.models import ImageMetadata, ProcessingResult, ProcessingConfig, FileOutput
from src.config import settings
from src.logger import logger


class ProcessingError(Exception):
    def __init__(self, message: str, stage: str, recoverable: bool = True):
        self.stage = stage
        self.recoverable = recoverable
        super().__init__(message)


# Map a source extension to its raw mime type.
_EXT_MIME = {
    "tif": "image/tiff",
    "tiff": "image/tiff",
    "ptif": "image/tiff",
    "ptiff": "image/tiff",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "bmp": "image/bmp",
}


def _source_ext(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lstrip(".").lower()
    return ext or "tiff"


def _raw_mime(ext: str) -> str:
    return _EXT_MIME.get(ext, "application/octet-stream")


def process_image(
    filepath: str,
    image_id: str,
    original_filename: str,
    camera_id: str,
    raw_data: bytes,
    pconfig: ProcessingConfig,
):
    """Flexible ingestion processor.

    Always stores the original bytes as the "raw" file. Optionally converts to
    PNG (keeping the smaller of PNG/original when configured) and optionally
    generates a thumbnail. Returns (ProcessingResult, files) where files is the
    list of FileOutput to upload.
    """
    logger.info("Starting image processing", image_id=image_id, filepath=filepath)

    source_ext = _source_ext(original_filename)
    validate_source_image(filepath, source_ext)

    with Image.open(filepath) as img:
        metadata = _extract_metadata(img, filepath)

        validate_dimensions(metadata.width_px, metadata.height_px)

        if metadata.num_frames > 1:
            logger.info("Multi-page image detected", image_id=image_id, frames=metadata.num_frames)
            img = _merge_multipage(img)

        if img.mode == "CMYK":
            img = img.convert("RGB")
            metadata.color_space = "RGB"

        if img.mode == "I" or img.mode == "F":
            img = _normalize_bit_depth(img)
            metadata.bit_depth = 8

        png_data: bytes | None = None
        thumb_data: bytes | None = None

        if pconfig.convert_to_png:
            png_data = _convert_to_png(img)

        if pconfig.generate_thumbnail:
            thumb_data = _generate_thumbnail(img, pconfig.thumbnail_size)

    timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

    camera_path = _build_camera_path(camera_id)
    safe_path = original_filename.replace('\\', '/').lstrip('/')
    basename = os.path.splitext(safe_path)[0]

    raw_mime = _raw_mime(source_ext)
    raw_object_key = f"raw/{camera_path}/{basename}.{source_ext}"

    # Raw is ALWAYS stored, using the original bytes + correct extension/mime.
    files: list[FileOutput] = [
        FileOutput(file_type="raw", object_key=raw_object_key, mime_type=raw_mime, data=raw_data),
    ]

    # Decide the "processed" file.
    if png_data is not None:
        use_png = True
        if pconfig.keep_smaller and len(png_data) >= len(raw_data):
            # PNG isn't smaller — keep the original as the processed file.
            use_png = False
            logger.info(
                "Keeping original as processed (PNG not smaller)",
                image_id=image_id,
                png_size=len(png_data),
                raw_size=len(raw_data),
            )

        if use_png:
            processed = FileOutput(
                file_type="processed",
                object_key=f"processed/{camera_path}/{basename}.png",
                mime_type="image/png",
                data=png_data,
            )
        else:
            processed = FileOutput(
                file_type="processed",
                object_key=f"processed/{camera_path}/{basename}.{source_ext}",
                mime_type=raw_mime,
                data=raw_data,
            )
    else:
        # No conversion requested — processed == original bytes.
        processed = FileOutput(
            file_type="processed",
            object_key=f"processed/{camera_path}/{basename}.{source_ext}",
            mime_type=raw_mime,
            data=raw_data,
        )
    files.append(processed)

    if thumb_data is not None:
        files.append(
            FileOutput(
                file_type="thumbnail",
                object_key=f"thumbnails/{camera_path}/{basename}_thumb.png",
                mime_type="image/png",
                data=thumb_data,
            )
        )

    # Checksum over concatenated output bytes (stable identity of the produced set).
    sha256 = compute_sha256_bytes(b"".join(f.data for f in files))

    result = ProcessingResult(
        image_id=image_id,
        original_filename=original_filename,
        sha256=sha256,
        metadata=metadata,
        files=files,
        processed_at=timestamp,
    )

    logger.info(
        "Image processing complete",
        image_id=image_id,
        width=metadata.width_px,
        height=metadata.height_px,
        files=[f.file_type for f in files],
        processed_mime=processed.mime_type,
    )

    return result, files


def _extract_metadata(img: Image.Image, filepath: str) -> ImageMetadata:
    width, height = img.size
    bit_depth = _get_bit_depth(img)
    color_space = img.mode
    compression = _get_compression(img)
    num_frames = getattr(img, "n_frames", 1)

    dpi = None
    if "dpi" in img.info:
        dpi = img.info["dpi"]

    tiff_tags = _extract_tiff_tags(img)

    raw_size = os.path.getsize(filepath)
    estimated_pixel_data = width * height * (bit_depth // 8) * len(img.getbands())
    compression_ratio = round(raw_size / max(estimated_pixel_data, 1), 2) if estimated_pixel_data > 0 else None

    return ImageMetadata(
        width_px=width,
        height_px=height,
        bit_depth=bit_depth,
        color_space=color_space,
        compression_type=compression,
        compression_ratio=compression_ratio,
        num_frames=num_frames,
        dpi=dpi,
        tiff_tags=tiff_tags,
    )


def _get_bit_depth(img: Image.Image) -> int:
    bits = img.info.get("bits_per_sample", 8)
    if isinstance(bits, tuple):
        return bits[0]
    if isinstance(bits, TiffImagePlugin.Rational):
        return int(bits)
    return int(bits)


def _get_compression(img: Image.Image) -> str:
    compression_map = {
        1: "Uncompressed",
        5: "LZW",
        7: "JPEG",
        8: "Deflate",
        32946: "Deflate",
        32773: "PackBits",
        2: "CCITT Group 3",
        3: "CCITT Group 4",
    }
    # tag_v2 only exists for TIFF images.
    tag_v2 = getattr(img, "tag_v2", None)
    if tag_v2 is None:
        # Fall back to Pillow's reported compression for non-TIFF formats.
        return img.info.get("compression", img.format or "Unknown")
    tag = tag_v2.get(259)
    if tag is None:
        return "Unknown"
    if isinstance(tag, tuple):
        tag = tag[0]
    return compression_map.get(int(tag), f"Unknown ({tag})")


def _extract_tiff_tags(img: Image.Image) -> dict:
    tags = {}
    tag_v2 = getattr(img, "tag_v2", None)
    if tag_v2 is None:
        return tags
    try:
        for tag_id, value in tag_v2.items():
            try:
                tag_name = TiffImagePlugin.TAGS.get(tag_id, str(tag_id))
            except Exception:
                tag_name = str(tag_id)

            if isinstance(value, bytes):
                try:
                    value = value.decode("ascii", errors="replace").strip("\x00")
                except Exception:
                    value = value.hex()[:64]

            if isinstance(value, TiffImagePlugin.Rational):
                value = float(value)

            if isinstance(value, tuple) and len(value) > 16:
                value = list(value[:16])

            tags[tag_name] = value
    except Exception as e:
        logger.warning("Failed to extract TIFF tags", error=str(e))

    return tags


def _normalize_bit_depth(img: Image.Image) -> Image.Image:
    img_array = np.array(img)
    if img_array.dtype == np.uint16:
        img_array = (img_array / 256).astype(np.uint8)
    elif img_array.dtype == np.float32:
        img_array = (img_array * 255).astype(np.uint8)
    elif img_array.dtype == np.uint32:
        img_array = (img_array / 16777216).astype(np.uint8)

    return Image.fromarray(img_array)


def _merge_multipage(img: Image.Image) -> Image.Image:
    pages = []
    for page in ImageSequence.Iterator(img):
        page_rgb = page.convert("RGB") if page.mode == "CMYK" else page
        pages.append(np.array(page_rgb))

    if not pages:
        return img

    merged = np.max(pages, axis=0).astype(np.uint8)
    return Image.fromarray(merged)


def _convert_to_png(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    save_img = img
    if save_img.mode not in ("1", "L", "LA", "P", "RGB", "RGBA", "I"):
        save_img = save_img.convert("RGB")
    save_img.save(buf, format="PNG", compress_level=settings.png_compression_level)
    buf.seek(0)
    return buf.getvalue()


def process_tiff(
    filepath: str,
    image_id: str,
    original_filename: str,
    camera_id: str,
):
    """Backward-compatible wrapper around :func:`process_image`.

    Returns the legacy ``(result, png_data, thumb_data)`` tuple using default
    processing options (convert to PNG + generate thumbnail).
    """
    with open(filepath, "rb") as f:
        raw_data = f.read()
    result, files = process_image(
        filepath=filepath,
        image_id=image_id,
        original_filename=original_filename,
        camera_id=camera_id,
        raw_data=raw_data,
        pconfig=ProcessingConfig(),
    )
    processed = result.file_of("processed")
    thumb = result.file_of("thumbnail")
    return result, (processed.data if processed else b""), (thumb.data if thumb else b"")


def _generate_thumbnail(img: Image.Image, size: int | None = None) -> bytes:
    if size is None:
        size = settings.thumbnail_size
    thumb = img.copy()
    thumb.thumbnail((size, size), Image.LANCZOS)

    if thumb.mode in ("RGBA", "P", "CMYK", "I", "F", "LA"):
        thumb = thumb.convert("RGB")

    buf = io.BytesIO()
    thumb.save(buf, format="PNG", compress_level=settings.png_compression_level)
    buf.seek(0)
    return buf.getvalue()


def _build_camera_path(camera_id: str) -> str:
    return f"{camera_id}/{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
