from __future__ import annotations

import os
from PIL import Image
import numpy as np
from src.processor import (
    process_tiff,
    _extract_metadata,
    _convert_to_png,
    _generate_thumbnail,
    _normalize_bit_depth,
    _merge_multipage,
    ProcessingError,
)
from src.config import settings


class TestProcessTiff:
    def test_process_rgb_tiff(self, test_tiff_path: str):
        result, png_data, thumb_data = process_tiff(
            filepath=test_tiff_path,
            image_id="test-img-1",
            original_filename="test.tiff",
            camera_id="cam-1",
        )

        assert result.image_id == "test-img-1"
        assert result.metadata.width_px == 640
        assert result.metadata.height_px == 480
        assert result.metadata.color_space == "RGB"
        assert result.metadata.compression_type == "LZW"
        assert len(result.sha256) == 64

        assert len(png_data) > 0
        assert len(thumb_data) > 0
        assert len(thumb_data) < len(png_data)

    def test_process_grayscale_tiff(self, test_grayscale_tiff_path: str):
        result, png_data, thumb_data = process_tiff(
            filepath=test_grayscale_tiff_path,
            image_id="test-img-2",
            original_filename="gray.tiff",
            camera_id="cam-1",
        )

        assert result.metadata.width_px == 320
        assert result.metadata.height_px == 240
        assert result.metadata.color_space == "L"

    def test_process_cmyk_tiff(self, test_cmyk_tiff_path: str):
        result, png_data, thumb_data = process_tiff(
            filepath=test_cmyk_tiff_path,
            image_id="test-img-3",
            original_filename="cmyk.tiff",
            camera_id="cam-1",
        )

        assert result.metadata.color_space == "RGB"

    def test_process_multipage_tiff(self, test_multipage_tiff_path: str):
        result, png_data, thumb_data = process_tiff(
            filepath=test_multipage_tiff_path,
            image_id="test-img-4",
            original_filename="multi.tiff",
            camera_id="cam-1",
        )

        assert result.metadata.num_frames > 1

    def test_invalid_file_raises_error(self, invalid_tiff_path: str):
        try:
            process_tiff(
                filepath=invalid_tiff_path,
                image_id="test-img-5",
                original_filename="bad.tiff",
                camera_id="cam-1",
            )
            pytest.fail("Should have raised ProcessingError")
        except ProcessingError:
            pass

    def test_png_is_valid_image(self, test_tiff_path: str):
        _, png_data, _ = process_tiff(
            filepath=test_tiff_path,
            image_id="test-img-6",
            original_filename="valid.tiff",
            camera_id="cam-1",
        )

        from PIL import Image
        import io

        img = Image.open(io.BytesIO(png_data))
        assert img.format == "PNG"
        img.verify()

    def test_thumbnail_is_smaller(self, test_tiff_path: str):
        _, png_data, thumb_data = process_tiff(
            filepath=test_tiff_path,
            image_id="test-img-7",
            original_filename="thumb.tiff",
            camera_id="cam-1",
        )

        assert len(thumb_data) < len(png_data)
        import io
        thumb_img = Image.open(io.BytesIO(thumb_data))
        assert thumb_img.width <= settings.thumbnail_size
        assert thumb_img.height <= settings.thumbnail_size


class TestConvertToPng:
    def test_rgb_to_png(self):
        img = Image.new("RGB", (100, 100), color=(255, 0, 0))
        data = _convert_to_png(img)
        assert len(data) > 0

        result = Image.open(io.BytesIO(data))
        assert result.format == "PNG"
        assert result.size == (100, 100)

    def test_grayscale_to_png(self):
        img = Image.new("L", (50, 50), color=128)
        data = _convert_to_png(img)
        result = Image.open(io.BytesIO(data))
        assert result.format == "PNG"

    import io


class TestGenerateThumbnail:
    def test_thumbnail_size(self):
        img = Image.new("RGB", (2000, 1500), color=(0, 128, 255))
        data = _generate_thumbnail(img)
        result = Image.open(io.BytesIO(data))
        assert result.width <= settings.thumbnail_size
        assert result.height <= settings.thumbnail_size

    def test_thumbnail_preserves_aspect_ratio(self):
        img = Image.new("RGB", (3000, 1000), color=(0, 128, 255))
        data = _generate_thumbnail(img)
        result = Image.open(io.BytesIO(data))
        aspect = 3000 / 1000
        thumb_aspect = result.width / result.height
        assert abs(thumb_aspect - aspect) < 0.1

    def test_small_image_doesnt_upscale(self):
        img = Image.new("RGB", (100, 100), color=(0, 128, 255))
        data = _generate_thumbnail(img)
        result = Image.open(io.BytesIO(data))
        assert result.width == 100
        assert result.height == 100


class TestNormalizeBitDepth:
    def test_uint16_to_uint8(self):
        arr = np.random.randint(0, 65535, (100, 100, 3), dtype=np.uint16)
        img = Image.fromarray(arr, mode="RGB")
        normalized = _normalize_bit_depth(img)
        assert normalized.mode == "RGB"
        assert np.array(normalized).dtype == np.uint8

    def test_float32_to_uint8(self):
        arr = np.random.rand(100, 100, 3).astype(np.float32)
        img = Image.fromarray(arr, mode="RGB")
        normalized = _normalize_bit_depth(img)
        assert np.array(normalized).dtype == np.uint8


class TestMergeMultipage:
    def test_single_page_unchanged(self):
        with Image.open(test_tiff_path) as img:
            img = Image.new("RGB", (100, 100), color=(255, 0, 0))
            merged = _merge_multipage(img)
            assert merged.size == (100, 100)
