"""Import and lock a FantasyPros Half-PPR consensus ADP snapshot."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal
from app.services.adp_import import fetch_html_records, read_records, store_snapshot
from scripts.migrate_database import migrate_database


CONFIG_PATH = BACKEND_ROOT / "app" / "resources" / "keeper_config.json"


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--file", type=Path, help="FantasyPros CSV, XLS, or XLSX export")
    source.add_argument("--url", default=None, help="FantasyPros ADP page URL")
    parser.add_argument("--no-lock", action="store_true", help="Import without making this the locked snapshot")
    args = parser.parse_args()

    migrate_database()
    source_url = args.url or (None if args.file else str(config["adp_url"]))
    if args.file:
        path = args.file.expanduser().resolve()
        if not path.is_file():
            parser.error(f"ADP file does not exist: {path}")
        records = read_records(path)
        source_name = f"FantasyPros export ({path.name})"
    else:
        records = fetch_html_records(str(source_url))
        source_name = str(config["adp_source"])

    if len(records) < 50:
        fallback = (
            " The public FantasyPros page may expose only a preview; export CSV/XLS/XLSX "
            "and rerun with --file."
            if not args.file
            else ""
        )
        raise RuntimeError(
            f"Refusing to import only {len(records)} ADP players; expected at least 50.{fallback}"
        )

    with SessionLocal() as db:
        snapshot = store_snapshot(
            db,
            records,
            season=int(config["season"]),
            source=source_name,
            source_url=source_url,
            scoring_format=str(config["scoring_format"]),
            league_size=int(config["league_size"]),
            lock=not args.no_lock,
        )
    print(
        f"Imported {len(records)} players into ADP snapshot {snapshot.id} "
        f"(locked={snapshot.is_locked})."
    )


if __name__ == "__main__":
    main()
