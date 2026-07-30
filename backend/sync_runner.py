"""Pull historical Yahoo Fantasy data into SQLite.

Run from the backend directory:

    python sync_runner.py
    python sync_runner.py --years 2019 2020 2021
    python sync_runner.py --years 2023 --force
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

from app import models  # noqa: F401 - register models with SQLAlchemy
from app.config import settings
from app.database import SessionLocal
from app.models.sync_log import SyncLog
from app.services.sync_lock import exclusive_sync_lock
from app.services.yahoo_sync import get_game_id_map, sync_season
from scripts.backup_database import create_backup
from scripts.migrate_database import migrate_database


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
LEAGUE_IDS_FILE = DATA_DIR / "league_ids.json"
SYNC_LOCK_FILE = DATA_DIR / ".sync.lock"


def _validated_years(requested_years: list[int] | None) -> list[int]:
    current_year = datetime.now().year
    years = requested_years or list(range(settings.league_start_year, current_year + 1))
    years = sorted(set(years))
    invalid = [year for year in years if year < 2000 or year > current_year + 1]
    if invalid:
        raise ValueError(f"Invalid season years: {invalid}")
    if not years:
        raise ValueError("At least one season year is required.")
    return years


def _load_league_ids() -> dict[int, str]:
    if not LEAGUE_IDS_FILE.exists():
        raise FileNotFoundError(
            f"Missing {LEAGUE_IDS_FILE}. Run: python scripts/find_league_ids.py"
        )

    with LEAGUE_IDS_FILE.open(encoding="utf-8") as league_ids_file:
        return {int(year): str(league_id) for year, league_id in json.load(league_ids_file).items()}


def _run_locked_sync(*, years: list[int], force: bool) -> None:
    league_id_map = _load_league_ids()
    logger.info("Loaded league IDs for years: %s", sorted(league_id_map))

    logger.info("Fetching Yahoo game IDs for seasons %s-%s.", years[0], years[-1])
    game_id_map = get_game_id_map(start_year=years[0])

    success: list[int] = []
    failed: list[int] = []
    skipped: list[int] = []

    with SessionLocal() as db:
        for year in years:
            if year not in game_id_map or year not in league_id_map:
                logger.warning("Season %s is missing a game ID or league ID; skipping.", year)
                skipped.append(year)
                continue

            if not force:
                existing = (
                    db.query(SyncLog)
                    .filter(
                        SyncLog.season_year == year,
                        SyncLog.status == "success",
                        SyncLog.week.is_(None),
                    )
                    .first()
                )
                if existing:
                    logger.info("Season %s is already synced; use --force to replace it.", year)
                    skipped.append(year)
                    continue

            logger.info(
                "Syncing season %s (game_id=%s, league_id=%s).",
                year,
                game_id_map[year],
                league_id_map[year],
            )
            try:
                sync_season(
                    db,
                    year=year,
                    game_id=game_id_map[year],
                    league_id=league_id_map[year],
                    log_id_ref=[],
                )
                success.append(year)
            except Exception:
                logger.exception("Season %s failed.", year)
                failed.append(year)

    logger.info("Sync complete. Success: %s. Skipped: %s. Failed: %s.", success, skipped, failed)
    if failed:
        retry_years = " ".join(str(year) for year in failed)
        raise RuntimeError(
            f"Sync failed for seasons {failed}. Retry with: "
            f"python sync_runner.py --years {retry_years} --force"
        )


def run_sync(*, years: list[int] | None = None, force: bool = False) -> None:
    """Run a migrated, backed-up, single-flight historical sync."""
    settings.require_yahoo_credentials()
    validated_years = _validated_years(years)

    with exclusive_sync_lock(SYNC_LOCK_FILE):
        migrate_database()
        create_backup()
        _run_locked_sync(years=validated_years, force=force)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--years", nargs="*", type=int, help="Specific years to sync")
    parser.add_argument("--force", action="store_true", help="Re-sync completed seasons")
    args = parser.parse_args()
    run_sync(years=args.years, force=args.force)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        logger.error("%s", error)
        sys.exit(1)
