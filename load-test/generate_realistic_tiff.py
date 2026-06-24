#!/usr/bin/env python3
"""Generate realistic TIFF files between 3-6 MB simulating production camera output."""

from __future__ import annotations

import argparse
import io
import os
import random
from PIL import Image, ImageDraw


# Camera sensor resolutions that produce 3-6 MB TIFF
SENSOR_CONFIGS = [
    (2592, 1944),   # 5MP
    (3264, 2448),   # 8MP  
    (3840, 2160),   # 4K
    (4000, 3000),   # 12MP
    (4608, 2592),   # 12MP wide
    (4912, 3264),   # 16MP
    (5184, 3456),   # 18MP
    (5472, 3080),   # 16:9 high-res
    (6000, 4000),   # 24MP
    (7360, 4912),   # 36MP
]


def random_solid_color_image(size: tuple[int, int], color_mode: str = "RGB") -> Image.Image:
    """Create a TIFF with realistic industrial camera noise patterns."""
    r = random.randint(0, 255)
    g = random.randint(0, 255)
    b = random.randint(0, 255)

    img = Image.new(color_mode, size)
    draw = ImageDraw.Draw(img)

    if color_mode == "RGB":
        # Fill with gradient to prevent easy compression
        for y in range(0, size[1], 50):
            shade = int(180 + 75 * (y / size[1]))
            draw.rectangle([(0, y), (size[0], min(y + 50, size[1]))], fill=(shade, shade, shade))

        # Add random artifacts (simulating real camera noise/defects)
        for _ in range(random.randint(5, 20)):
            x1 = random.randint(0, size[0] - 50)
            y1 = random.randint(0, size[1] - 50)
            draw.rectangle(
                [(x1, y1), (x1 + random.randint(10, 100), y1 + random.randint(10, 100))],
                outline=(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)),
                width=random.randint(1, 3),
            )

        # Grid overlay (similar to real camera calibration patterns)
        for x in range(0, size[0], random.randint(100, 300)):
            draw.line([(x, 0), (x, size[1])], fill=(r, g, b), width=1)
        for y in range(0, size[1], random.randint(100, 300)):
            draw.line([(0, y), (size[0], y)], fill=(r, g, b), width=1)
    else:
        img = Image.new(color_mode, size, color=(r, g, b))

    return img


def generate_tiff(target_size_bytes: int, output_path: str) -> tuple[int, int, int]:
    """Generate a TIFF file approximating target_size_bytes."""
    sizes_tried = []

    for sensor in SENSOR_CONFIGS:
        # Try with uncompressed first to reach target size
        for compression in [None, "tiff_deflate", "lzw", "packbits"]:
            buf = io.BytesIO()
            img = random_solid_color_image(sensor)
            try:
                img.save(buf, format="TIFF", compression=compression)
                actual_size = buf.tell()
                sizes_tried.append((sensor, compression, actual_size))

                if abs(actual_size - target_size_bytes) / target_size_bytes < 0.3:
                    img.save(output_path, format="TIFF", compression=compression)
                    w, h = sensor
                    return w, h, actual_size
            except Exception:
                continue

    # Fallback: pick closest match
    best = min(sizes_tried, key=lambda x: abs(x[2] - target_size_bytes))
    sensor, compression, actual_size = best
    img = random_solid_color_image(sensor)
    img.save(output_path, format="TIFF", compression=compression)
    return sensor[0], sensor[1], actual_size


def generate_fixed_size_tiff(width: int, height: int, output_path: str) -> int:
    """Generate a TIFF with specific dimensions for precise size control."""
    img = random_solid_color_image((width, height))
    img.save(output_path, format="TIFF", compression=None)
    return os.path.getsize(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate realistic production TIFF files")
    parser.add_argument("--output", required=True, help="Output file path")
    parser.add_argument("--target-size", type=int, default=4 * 1024 * 1024, help="Target file size in bytes (default: 4MB)")
    parser.add_argument("--width", type=int, help="Fixed width (overrides target-size estimation)")
    parser.add_argument("--height", type=int, help="Fixed height (overrides target-size estimation)")
    args = parser.parse_args()

    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)

    if args.width and args.height:
        actual = generate_fixed_size_tiff(args.width, args.height, args.output)
    else:
        w, h, actual = generate_tiff(args.target_size, args.output)

    print(f"Created: {args.output} ({w}x{h}, {actual:,} bytes, {actual/1024/1024:.2f} MB)")
