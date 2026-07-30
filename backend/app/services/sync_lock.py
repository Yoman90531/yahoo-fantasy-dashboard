"""Cross-process lock used to keep historical syncs single-flight."""

from __future__ import annotations

import os
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


@contextmanager
def exclusive_sync_lock(lock_path: Path, *, stale_after_seconds: int = 6 * 60 * 60) -> Iterator[None]:
    """Acquire an atomic filesystem lock and remove it when work completes."""
    lock_path.parent.mkdir(parents=True, exist_ok=True)

    if lock_path.exists():
        age = time.time() - lock_path.stat().st_mtime
        if age > stale_after_seconds:
            lock_path.unlink()

    try:
        descriptor = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as error:
        owner = lock_path.read_text(encoding="utf-8").strip() or "unknown process"
        raise RuntimeError(f"A sync is already running ({owner}).") from error

    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as lock_file:
            lock_file.write(f"pid={os.getpid()} started={time.time():.0f}\n")
        yield
    finally:
        lock_path.unlink(missing_ok=True)
