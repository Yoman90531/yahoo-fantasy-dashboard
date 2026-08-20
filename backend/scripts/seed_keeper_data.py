"""Idempotently seed the bundled Keeper Lab ADP snapshot."""

from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal
from app.models.adp import AdpEntry, AdpSnapshot
from app.services.adp_import import AdpRecord, read_records, store_snapshot
from scripts.migrate_database import migrate_database


CONFIG_PATH = BACKEND_ROOT / "app" / "resources" / "keeper_config.json"
ADP_PATH = BACKEND_ROOT / "app" / "resources" / "fantasypros_2026_half_ppr_adp.csv"


def _matches(entry: AdpEntry, record: AdpRecord) -> bool:
    return (
        entry.rank == record.rank
        and entry.player_name == record.player_name
        and entry.position == record.position
        and entry.nfl_team == record.nfl_team
        and entry.average_adp == record.average_adp
    )


def main() -> None:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    records = read_records(ADP_PATH)
    if len(records) < 50:
        raise RuntimeError(f"Refusing to seed only {len(records)} ADP players; expected at least 50.")

    season = int(config["season"])
    scoring_format = str(config["scoring_format"])
    source = "FantasyPros 2026 Half-PPR export"
    migrate_database()

    with SessionLocal() as db:
        current = (
            db.query(AdpSnapshot)
            .filter(
                AdpSnapshot.season == season,
                AdpSnapshot.scoring_format == scoring_format,
                AdpSnapshot.is_locked.is_(True),
            )
            .order_by(AdpSnapshot.id.desc())
            .first()
        )
        if current:
            entries = (
                db.query(AdpEntry)
                .filter(AdpEntry.snapshot_id == current.id)
                .order_by(AdpEntry.rank)
                .all()
            )
            if len(entries) == len(records) and all(
                _matches(entry, record) for entry, record in zip(entries, records, strict=True)
            ):
                print(f"Keeper ADP snapshot {current.id} already matches {len(records)} players.")
                return

        snapshot = store_snapshot(
            db,
            records,
            season=season,
            source=source,
            source_url=str(config["adp_url"]),
            scoring_format=scoring_format,
            league_size=int(config["league_size"]),
            lock=True,
        )
        print(f"Seeded Keeper ADP snapshot {snapshot.id} with {len(records)} players.")


if __name__ == "__main__":
    main()
