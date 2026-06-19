#!/usr/bin/env python3
"""Generate sample TIFF files for testing the image-processing-worker."""

from __future__ import annotations

import argparse
import os
from PIL import Image, ImageDraw, ImageFont


def create_test_pattern(size: tuple[int, int]) -> Image.Image:
    img = Image.new("RGB", size, color=(240, 240, 240))
    draw = ImageDraw.Draw(img)

    for x in range(0, size[0], 50):
        draw.line([(x, 0), (x, size[1])], fill=(200, 200, 200), width=1)
    for y in range(0, size[1], 50):
        draw.line([(0, y), (size[0], y)], fill=(200, 200, 200), width=1)

    draw.rectangle([50, 50, size[0] - 50, size[1] - 50], outline=(0, 0, 255), width=3)
    draw.ellipse([100, 100, size[0] - 100, size[1] - 100], outline=(255, 0, 0), width=2)

    draw.text((size[0] // 2 - 100, size[1] // 2 - 10), "TEST PATTERN", fill=(0, 0, 0))

    return img


def main():
    parser = argparse.ArgumentParser(description="Generate test TIFF files")
    parser.add_argument("--output-dir", default=".", help="Output directory")
    parser.add_argument("--width", type=int, default=1920, help="Image width")
    parser.add_argument("--height", type=int, default=1080, help="Image height")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    sizes = [
        ("small", (320, 240)),
        ("medium", (640, 480)),
        ("large", (1920, 1080)),
        ("xlarge", (4096, 3072)),
    ]

    for name, size in sizes:
        img = create_test_pattern(size)

        filepath = os.path.join(args.output_dir, f"test_{name}.tiff")
        img.save(filepath, format="TIFF", compression="lzw")
        file_size = os.path.getsize(filepath)
        print(f"Created: {filepath} ({size[0]}x{size[1]}, {file_size:,} bytes)")

    grayscale = Image.new("L", (640, 480), color=128)
    draw = ImageDraw.Draw(grayscale)
    draw.rectangle([100, 100, 540, 380], fill=200)
    gs_path = os.path.join(args.output_dir, "test_grayscale.tiff")
    grayscale.save(gs_path, format="TIFF", compression="packbits")
    print(f"Created: {gs_path}")

    cmyk = Image.new("CMYK", (800, 600), color=(0, 50, 100, 0))
    cmyk_path = os.path.join(args.output_dir, "test_cmyk.tiff")
    cmyk.save(cmyk_path, format="TIFF", compression="tiff_deflate")
    print(f"Created: {cmyk_path}")

    pages = [
        Image.new("RGB", (400, 300), color=(255, 0, 0)),
        Image.new("RGB", (400, 300), color=(0, 255, 0)),
        Image.new("RGB", (400, 300), color=(0, 0, 255)),
    ]
    multi_path = os.path.join(args.output_dir, "test_multipage.tiff")
    pages[0].save(
        multi_path,
        format="TIFF",
        compression="lzw",
        save_all=True,
        append_images=pages[1:],
    )
    print(f"Created: {multi_path} (3 pages)")

    print("\nTest files generated in:", args.output_dir)


if __name__ == "__main__":
    main()
