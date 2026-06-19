from __future__ import annotations

import pytest
from src.validator import (
    validate_tiff,
    validate_dimensions,
    ImageValidationError,
)


class TestValidateTiff:
    def test_valid_rgb_tiff(self, test_tiff_path: str):
        validate_tiff(test_tiff_path)

    def test_valid_grayscale_tiff(self, test_grayscale_tiff_path: str):
        validate_tiff(test_grayscale_tiff_path)

    def test_invalid_file(self, invalid_tiff_path: str):
        with pytest.raises(ImageValidationError, match="Invalid TIFF byte order"):
            validate_tiff(invalid_tiff_path)

    def test_empty_file(self, empty_file_path: str):
        with pytest.raises(ImageValidationError, match="File too small"):
            validate_tiff(empty_file_path)

    def test_missing_file(self):
        with pytest.raises(FileNotFoundError):
            validate_tiff("/nonexistent/path.tiff")

    def test_large_tiff(self, large_tiff_path: str):
        validate_tiff(large_tiff_path)

    def test_cmyk_tiff(self, test_cmyk_tiff_path: str):
        validate_tiff(test_cmyk_tiff_path)

    def test_multipage_tiff(self, test_multipage_tiff_path: str):
        validate_tiff(test_multipage_tiff_path)


class TestValidateDimensions:
    def test_valid_dimensions(self):
        validate_dimensions(1920, 1080)

    def test_zero_width(self):
        with pytest.raises(ImageValidationError, match="Invalid dimensions"):
            validate_dimensions(0, 1080)

    def test_zero_height(self):
        with pytest.raises(ImageValidationError, match="Invalid dimensions"):
            validate_dimensions(1920, 0)

    def test_negative_dimensions(self):
        with pytest.raises(ImageValidationError, match="Invalid dimensions"):
            validate_dimensions(-100, 100)

    def test_too_large(self):
        with pytest.raises(ImageValidationError, match="Image too large"):
            validate_dimensions(20000, 20000, max_pixels=100_000_000)
