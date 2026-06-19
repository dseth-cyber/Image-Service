from __future__ import annotations

import os
import tempfile
from src.checksum import compute_sha256, compute_sha256_bytes


class TestComputeSha256:
    def test_known_string(self):
        result = compute_sha256_bytes(b"hello world")
        assert result == "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"

    def test_empty_bytes(self):
        result = compute_sha256_bytes(b"")
        assert result == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    def test_file_checksum(self, test_tiff_path: str):
        result = compute_sha256(test_tiff_path)
        assert len(result) == 64
        assert all(c in "0123456789abcdef" for c in result)

    def test_deterministic(self, test_tiff_path: str):
        first = compute_sha256(test_tiff_path)
        second = compute_sha256(test_tiff_path)
        assert first == second

    def test_large_file(self):
        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(b"A" * 10 * 1024 * 1024)
            f.flush()
            path = f.name

        try:
            result = compute_sha256(path)
            assert len(result) == 64
        finally:
            os.unlink(path)
