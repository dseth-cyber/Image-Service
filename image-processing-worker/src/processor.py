from __future__ import annotations

import io
import os
from datetime import datetime, timezone
from PIL import Image, ImageSequence, TiffImagePlugin
import numpy as np
from src.validator import (
    validate_tiff,
    validate_dimensions,
    ImageValidationError,
)
from src.checksum import compute_sha256_bytes
from src.models import ImageMetadata, ProcessingResult
from src.config import settings
from src.logger import logger


class ProcessingError(Exception):
    def __init__(self, message: str, stage: str, recoverable: bool = True):
        self.stage = stage
        self.recoverable = recoverable
        super().__init__(message)


def process_tiff(
    filepath: str,
    image_id: str,
    original_filename: str,
    camera_id: str,
) -> ProcessingResult:
    logger.info("Starting TIFF processing", image_id=image_id, filepath=filepath)

    validate_tiff(filepath)

    with Image.open(filepath) as img:
        metadata = _extract_metadata(img, filepath)

        validate_dimensions(metadata.width_px, metadata.height_px)

        if metadata.num_frames > 1:
            logger.info(
                "Multi-page TIFF detected",
                image_id=image_id,
                frames=metadata.num_frames,
            )
            img = _merge_multipage(img)

        if img.mode == "CMYK":
            img = img.convert("RGB")
            metadata.color_space = "RGB"

        if img.mode == "I" or img.mode == "F":
            img = _normalize_bit_depth(img)
            metadata.bit_depth = 8

        png_data = _convert_to_png(img)
        thumb_data = _generate_thumbnail(img)

    sha256 = compute_sha256_bytes(png_data + thumb_data)
    timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

    camera_path = _build_camera_path(camera_id)
    basename = os.path.splitext(os.path.basename(original_filename))[0]

    raw_object_key = f"raw/{camera_path}/{basename}.tiff"
    png_object_key = f"processed/{camera_path}/{basename}.png"
    thumb_object_key = f"thumbnails/{camera_path}/{basename}_thumb.png"

    raw_size = os.path.getsize(filepath)

    result = ProcessingResult(
        image_id=image_id,
        original_filename=original_filename,
        png_size_bytes=len(png_data),
        thumbnail_size_bytes=len(thumb_data),
        raw_size_bytes=raw_size,
        sha256=sha256,
        metadata=metadata,
        raw_object_key=raw_object_key,
        png_object_key=png_object_key,
        thumbnail_object_key=thumb_object_key,
        processed_at=timestamp,
    )

    logger.info(
        "TIFF processing complete",
        image_id=image_id,
        width=metadata.width_px,
        height=metadata.height_px,
        png_size=result.png_size_bytes,
        thumbnail_size=result.thumbnail_size_bytes,
    )

    return result, png_data, thumb_data


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
    tag = img.tag_v2.get(259)
    if tag is None:
        return "Unknown"
    if isinstance(tag, tuple):
        tag = tag[0]
    return compression_map.get(int(tag), f"Unknown ({tag})")


def _extract_tiff_tags(img: Image.Image) -> dict:
    tags = {}
    try:
        for tag_id, value in img.tag_v2.items():
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
    img.save(buf, format="PNG", compress_level=settings.png_compression_level)
    buf.seek(0)
    return buf.getvalue()


def _generate_thumbnail(img: Image.Image) -> bytes:
    size = settings.thumbnail_size
    thumb = img.copy()
    thumb.thumbnail((size, size), Image.LANCZOS)

    if thumb.mode in ("RGBA", "P"):
        thumb = thumb.convert("RGB")

    buf = io.BytesIO()
    thumb.save(buf, format="PNG", compress_level=settings.png_compression_level)
    buf.seek(0)
    return buf.getvalue()


def _build_camera_path(camera_id: str) -> str:
    return f"{camera_id}/{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
