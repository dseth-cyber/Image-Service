import hashlib
from src.logger import logger


def compute_sha256(filepath: str) -> str:
    hash_sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hash_sha256.update(chunk)

    digest = hash_sha256.hexdigest()
    logger.debug("SHA256 computed", filepath=filepath, digest=digest[:16])
    return digest


def compute_sha256_bytes(data: bytes) -> str:
    digest = hashlib.sha256(data).hexdigest()
    return digest
