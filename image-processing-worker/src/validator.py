from PIL import Image
from src.logger import logger


class ImageValidationError(Exception):
    def __init__(self, message: str, stage: str = "validation"):
        self.stage = stage
        super().__init__(message)


TIFF_EXTENSIONS = {"tif", "tiff", "ptif", "ptiff"}


def validate_tiff(filepath: str) -> None:
    """Strict TIFF validation (header + Pillow). Kept for backward compatibility."""
    _check_header(filepath)
    _check_pillow_open(filepath)


def validate_source_image(filepath: str, ext: str) -> None:
    """Validate a source image of any accepted format.

    For TIFF-family files we run the strict byte-order/magic header check.
    For other formats (jpg/png/bmp) we skip the TIFF-specific header check and
    rely on Pillow open/verify so they aren't wrongly rejected.
    """
    ext = (ext or "").lstrip(".").lower()
    if ext in TIFF_EXTENSIONS:
        _check_header(filepath)
    _check_pillow_open(filepath)


def _check_header(filepath: str) -> None:
    with open(filepath, "rb") as f:
        header = f.read(4)

    if len(header) < 4:
        raise ImageValidationError(
            f"File too small ({len(header)} bytes) to be a valid TIFF",
            stage="header_check",
        )

    little_endian = header[:2] == b"II"
    big_endian = header[:2] == b"MM"

    if not (little_endian or big_endian):
        raise ImageValidationError(
            f"Invalid TIFF byte order marker: {header[:2].hex()}. "
            f"Expected 'II' (0x4949) or 'MM' (0x4D4D)",
            stage="header_check",
        )

    magic_bytes = header[2:4]
    if magic_bytes != b"\x2A\x00":
        raise ImageValidationError(
            f"Invalid TIFF magic number: {magic_bytes.hex()}. Expected 0x2A00",
            stage="header_check",
        )

    logger.debug("TIFF header validation passed", filepath=filepath)


def _check_pillow_open(filepath: str) -> None:
    try:
        with Image.open(filepath) as img:
            img.verify()
    except Exception as e:
        raise ImageValidationError(
            f"Pillow verification failed: {e}",
            stage="pillow_verify",
        ) from e

    try:
        with Image.open(filepath) as img:
            img.load()
    except Exception as e:
        raise ImageValidationError(
            f"Pillow load failed (possible corruption): {e}",
            stage="pillow_load",
        ) from e

    logger.debug("Pillow validation passed", filepath=filepath)


def validate_processed_image(image_data: bytes, expected_format: str = "PNG") -> None:
    try:
        with Image.open(io.BytesIO(image_data)) as img:
            img.verify()
    except Exception as e:
        raise ImageValidationError(
            f"Processed image validation failed: {e}",
            stage="output_validation",
        ) from e


def validate_dimensions(
    width: int, height: int, max_pixels: int = 100_000_000
) -> None:
    if width <= 0 or height <= 0:
        raise ImageValidationError(
            f"Invalid dimensions: {width}x{height}",
            stage="dimension_check",
        )
    if width * height > max_pixels:
        raise ImageValidationError(
            f"Image too large: {width}x{height} ({width * height} pixels)",
            stage="dimension_check",
        )


import io
