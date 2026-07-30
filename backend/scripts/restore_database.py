"""Verify a SQLite backup and restore it to an explicit destination."""

from __future__ import annotations

import argparse
import shutil
import sqlite3
from contextlib import closing
from pathlib import Path


REQUIRED_TABLES = {"managers", "seasons", "teams", "matchups"}


def verify_backup(backup_path: Path) -> set[str]:
    source = backup_path.expanduser().resolve()
    if not source.is_file():
        raise FileNotFoundError(f"Backup does not exist: {source}")

    with closing(sqlite3.connect(f"file:{source.as_posix()}?mode=ro", uri=True)) as db:
        integrity = db.execute("PRAGMA integrity_check").fetchone()
        if integrity is None or integrity[0] != "ok":
            raise RuntimeError(f"Backup integrity check failed: {integrity}")
        tables = {
            row[0]
            for row in db.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }

    missing = REQUIRED_TABLES - tables
    if missing:
        raise RuntimeError(
            f"Backup is missing required tables: {', '.join(sorted(missing))}"
        )
    return tables


def restore_backup(
    backup_path: Path,
    destination_path: Path,
    *,
    force: bool = False,
) -> Path:
    source = backup_path.expanduser().resolve()
    destination = destination_path.expanduser().resolve()
    verify_backup(source)

    if source == destination:
        raise ValueError("Backup and restore destination must be different files")
    if destination.exists() and not force:
        raise FileExistsError(
            f"Destination already exists: {destination}. Pass --force to replace it."
        )

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(f".{destination.name}.restore")
    temporary.unlink(missing_ok=True)
    shutil.copy2(source, temporary)
    verify_backup(temporary)
    temporary.replace(destination)
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backup", type=Path, help="Backup SQLite file to verify")
    parser.add_argument(
        "--destination",
        type=Path,
        help="Explicit restore destination; omit to perform verification only",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace the destination if it already exists",
    )
    args = parser.parse_args()

    tables = verify_backup(args.backup)
    print(f"Verified {args.backup.resolve()} ({len(tables)} tables)")
    if args.destination:
        restored = restore_backup(args.backup, args.destination, force=args.force)
        print(f"Restored to {restored}")


if __name__ == "__main__":
    main()
