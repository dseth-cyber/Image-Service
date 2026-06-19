from __future__ import annotations

import os
import tempfile
from typing import Generator
from PIL import Image
import pytest


@pytest.fixture
def test_tiff_path() -> Generator[str, None, None]:
    with tempfile.NamedTemporaryFile(suffix=".tiff", delete=False) as f:
        img = Image.new("RGB", (640, 480), color=(128, 128, 255))
        img.save(f, format="TIFF", compression="lzw")
        f.flush()
        temp_path = f.name

    yield temp_path

    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def test_grayscale_tiff_path() -> Generator[str, None, None]:
    with tempfile.NamedTemporaryFile(suffix=".tiff", delete=False) as f:
        img = Image.new("L", (320, 240), color=128)
        img.save(f, format="TIFF", compression="packbits")
        f.flush()
        temp_path = f.name

    yield temp_path

    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def test_cmyk_tiff_path() -> Generator[str, None, None]:
    with tempfile.NamedTemporaryFile(suffix=".tiff", delete=False) as f:
        img = Image.new("CMYK", (800, 600), color=(0, 100, 100, 0))
        img.save(f, format="TIFF", compression="tiff_deflate")
        f.flush()
        temp_path = f.name

    yield temp_path

    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def test_multipage_tiff_path() -> Generator[str, None, None]:
    with tempfile.NamedTemporaryFile(suffix=".tiff", delete=False) as f:
        pages = [
            Image.new("RGB", (100, 100), color=(255, 0, 0)),
            Image.new("RGB", (100, 100), color=(0, 255, 0)),
            Image.new("RGB", (100, 100), color=(0, 0, 255)),
        ]
        pages[0].save(
            f,
            format="TIFF",
            compression="lzw",
            save_all=True,
            append_images=pages[1:],
        )
        f.flush()
        temp_path = f.name

    yield temp_path

    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def invalid_tiff_path() -> Generator[str, None, None]:
    with tempfile.NamedTemporaryFile(suffix=".tiff", delete=False) as f:
        f.write(b"not a tiff file at all")
        f.flush()
        temp_path = f.name

    yield temp_path

    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def empty_file_path() -> Generator[str, None, None]:
    with tempfile.NamedTemporaryFile(suffix=".tiff", delete=False) as f:
        temp_path = f.name

    yield temp_path

    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def large_tiff_path() -> Generator[str, None, None]:
    with tempfile.NamedTemporaryFile(suffix=".tiff", delete=False) as f:
        img = Image.new("RGB", (2000, 2000), color=(64, 64, 64))
        img.save(f, format="TIFF", compression="lzw")
        f.flush()
        temp_path = f.name

    yield temp_path

    if os.path.exists(temp_path):
        os.unlink(temp_path)
