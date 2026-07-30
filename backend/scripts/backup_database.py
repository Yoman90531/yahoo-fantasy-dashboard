"""Create a consistent, timestamped backup of the SQLite database."""

from __future__ import annotations

import argparse
import logging
import sqlite3
import sys
from contextlib import closing
from datetime import UTC, datetime
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.config import settings


logger = logging.getLogger(__name__)


def sqlite_path_from_url(database_url: str) -> Path | None:
    """Return the filesystem path for a SQLite URL, or None for other databases."""
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        return None

    raw_path = database_url.removeprefix(prefix)
    if raw_path == ":memory:":
        return None
    return Path(raw_path).expanduser().resolve()


def create_backup(
    database_url: str = settings.database_url,
    *,
    backup_dir: Path | None = None,
    keep: int = 14,
) -> Path | None:
    """Back up SQLite with its online backup API and retain the newest copies."""
    source_path = sqlite_path_from_url(database_url)
    if source_path is None:
        logger.info("Database backup skipped: only file-backed SQLite is supported.")
        return None
    if not source_path.exists():
        logger.info("Database backup skipped: %s does not exist yet.", source_path)
        return None

    destination_dir = backup_dir or source_path.parent / "backups"
    destination_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    destination = destination_dir / f"{source_path.stem}-{timestamp}.sqlite3"

    with (
        closing(sqlite3.connect(source_path)) as source,
        closing(sqlite3.connect(destination)) as target,
    ):
        source.backup(target)
        result = target.execute("PRAGMA integrity_check").fetchone()
    if result is None or result[0] != "ok":
        destination.unlink(missing_ok=True)
        raise RuntimeError(f"Backup integrity check failed: {result}")

    if keep >= 0:
        backups = sorted(
            destination_dir.glob(f"{source_path.stem}-*.sqlite3"),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        for expired in backups[keep:]:
            expired.unlink()

    logger.info("Database backup created: %s", destination)
    return destination


def upload_backup(
    backup_path: Path,
    *,
    bucket: str,
    prefix: str = "fantasy-dashboard",
    endpoint_url: str = "",
) -> str:
    """Upload a verified backup to opt-in S3-compatible object storage."""
    if not bucket:
        raise ValueError("An S3 bucket is required")

    with closing(sqlite3.connect(f"file:{backup_path.resolve().as_posix()}?mode=ro", uri=True)) as db:
        result = db.execute("PRAGMA integrity_check").fetchone()
    if result is None or result[0] != "ok":
        raise RuntimeError(f"Backup integrity check failed before upload: {result}")

    import boto3

    object_key = "/".join(
        part.strip("/")
        for part in (prefix, backup_path.name)
        if part.strip("/")
    )
    client = boto3.client("s3", endpoint_url=endpoint_url or None)
    client.upload_file(str(backup_path), bucket, object_key)
    logger.info("Database backup uploaded to s3://%s/%s", bucket, object_key)
    return object_key


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--keep", type=int, default=14, help="Number of backups to retain")
    parser.add_argument("--output-dir", type=Path, help="Backup destination directory")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    backup = create_backup(backup_dir=args.output_dir, keep=args.keep)
    if backup is not None and settings.backup_s3_bucket:
        upload_backup(
            backup,
            bucket=settings.backup_s3_bucket,
            prefix=settings.backup_s3_prefix,
            endpoint_url=settings.backup_s3_endpoint_url,
        )


if __name__ == "__main__":
    main()
