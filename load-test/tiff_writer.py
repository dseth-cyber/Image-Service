#!/usr/bin/env python3
"""Continuous TIFF writer simulating 10 production cameras.

Each camera writes a new TIFF file every WRITE_INTERVAL seconds.
File sizes are randomized between 3-6 MB to match production characteristics.
"""

from __future__ import annotations

import os
import random
import time
import sys
from datetime import datetime
from pathlib import Path

# Add parent dir so we can import
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generate_realistic_tiff import generate_tiff, generate_fixed_size_tiff

# Configuration
WRITE_INTERVAL = int(os.environ.get("WRITE_INTERVAL", "30"))       # seconds between writes per camera
CAMERA_COUNT = int(os.environ.get("CAMERA_COUNT", "10"))
OUTPUT_BASE = os.environ.get("OUTPUT_BASE", "/share")
MIN_SIZE_MB = float(os.environ.get("MIN_SIZE_MB", "3"))
MAX_SIZE_MB = float(os.environ.get("MAX_SIZE_MB", "6"))
FIXED_SIZE = os.environ.get("FIXED_SIZE", "").lower() == "true"

CAMERA_DIRS = [os.path.join(OUTPUT_BASE, f"cam_{i}") for i in range(1, CAMERA_COUNT + 1)]


def ensure_dirs():
    for d in CAMERA_DIRS:
        os.makedirs(d, exist_ok=True)
        print(f"  Camera dir: {d}")


def write_single_file(camera_idx: int, camera_dir: str) -> dict:
    """Write one TIFF file for a camera. Returns result metadata."""
    target_mb = random.uniform(MIN_SIZE_MB, MAX_SIZE_MB)
    target_bytes = int(target_mb * 1024 * 1024)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    seq = random.randint(1000, 9999)
    filename = f"IMG_{timestamp}_{seq:04d}.tiff"
    filepath = os.path.join(camera_dir, filename)

    start = time.time()

    try:
        if FIXED_SIZE:
            w, h = 4000, 3000
            actual_bytes = generate_fixed_size_tiff(w, h, filepath)
        else:
            w, h, actual_bytes = generate_tiff(target_bytes, filepath)

        elapsed = time.time() - start
        actual_mb = actual_bytes / (1024 * 1024)

        return {
            "camera": camera_idx,
            "filename": filename,
            "width": w,
            "height": h,
            "target_mb": round(target_mb, 2),
            "actual_mb": round(actual_mb, 2),
            "actual_bytes": actual_bytes,
            "elapsed_s": round(elapsed, 3),
            "success": True,
        }
    except Exception as e:
        elapsed = time.time() - start
        return {
            "camera": camera_idx,
            "filename": filename,
            "error": str(e),
            "elapsed_s": round(elapsed, 3),
            "success": False,
        }


def main():
    print("=" * 60)
    print(f"TIFF Writer — Load Test Simulator")
    print(f"  Cameras:       {CAMERA_COUNT}")
    print(f"  Interval:      {WRITE_INTERVAL}s per camera")
    print(f"  Size range:    {MIN_SIZE_MB}-{MAX_SIZE_MB} MB")
    print(f"  Output base:   {OUTPUT_BASE}")
    print(f"  Fixed size:    {FIXED_SIZE}")
    print("=" * 60)

    ensure_dirs()

    cycle = 0
    total_files = 0
    total_bytes = 0
    total_errors = 0
    start_time = time.time()

    while True:
        cycle += 1
        cycle_start = time.time()
        batch_results = []

        print(f"\n--- Cycle {cycle} @ {datetime.now().strftime('%H:%M:%S')} ---")

        for i, camera_dir in enumerate(CAMERA_DIRS):
            result = write_single_file(i + 1, camera_dir)
            batch_results.append(result)

            if result["success"]:
                total_files += 1
                total_bytes += result["actual_bytes"]
                status = f"OK  {result['actual_mb']:.2f}MB ({result['width']}x{result['height']}) in {result['elapsed_s']}s"
            else:
                total_errors += 1
                status = f"ERR {result['error']}"

            print(f"  Cam {i+1:2d}: {status}")

        # Summary
        cycle_elapsed = time.time() - cycle_start
        batch_bytes = sum(r.get("actual_bytes", 0) for r in batch_results if r["success"])
        total_elapsed = time.time() - start_time
        avg_speed = (total_bytes / (1024 * 1024)) / (total_elapsed / 60) if total_elapsed > 0 else 0

        print(f"--- Cycle {cycle} complete: {batch_bytes/1024/1024:.1f}MB written in {cycle_elapsed:.1f}s ---")
        print(f"    Total: {total_files} files, {total_bytes/1024/1024/1024:.2f} GB, {avg_speed:.1f} MB/min, errors={total_errors}")

        # Wait for next cycle (accounting for write time)
        sleep_time = max(1, WRITE_INTERVAL - cycle_elapsed)
        time.sleep(sleep_time)


if __name__ == "__main__":
    main()
