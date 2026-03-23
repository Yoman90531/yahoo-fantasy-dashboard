"""
CLI script to pull historical Yahoo Fantasy data into SQLite.

Usage (from the backend/ directory):
    # Sync all seasons from LEAGUE_START_YEAR to current year:
    python sync_runner.py

    # Sync specific years:
    python sync_runner.py --years 2019 2020 2021

    # Re-sync a single year (even if already synced):
    python sync_runner.py --years 2023 --force
"""
import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Bootstrap path so we can import app modules
import os
sys.path.insert(0, os.path.dirname(__file__))

DATA_DIR = Path(__file__).parent.parent / "data"
LEAGUE_IDS_FILE = DATA_DIR / "league_ids.json"

from app.config import settings
from app.database import engine, SessionLocal
from app.models import *  # noqa: F401 — registers all models with Base
from app.database import Base
from app.services.yahoo_sync import get_game_id_map, sync_season


def main():
    parser = argparse.ArgumentParser(description="Sync Yahoo Fantasy Football data")
    parser.add_argument("--years", nargs="*", type=int, help="Specific years to sync")
    parser.add_argument("--force", action="store_true", help="Re-sync even if already synced")
    args = parser.parse_args()

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified.")

    db = SessionLocal()
    try:
        # Determine which years to sync
        current_year = datetime.now().year
        if args.years:
            years_to_sync = sorted(args.years)
        else:
            years_to_sync = list(range(settings.league_start_year, current_year + 1))

        # Load per-year league IDs (required — run scripts/find_league_ids.py first)
        if not LEAGUE_IDS_FILE.exists():
            logger.error(
                f"Missing {LEAGUE_IDS_FILE}. "
                "Run: C:\\Python314\\python.exe scripts/find_league_ids.py"
            )
            sys.exit(1)
        with open(LEAGUE_IDS_FILE) as f:
            league_id_map: dict[int, str] = {int(k): v for k, v in json.load(f).items()}
        logger.info(f"Loaded league IDs for years: {sorted(league_id_map.keys())}")

        logger.info(f"Fetching Yahoo game ID map for NFL seasons {years_to_sync[0]}–{years_to_sync[-1]}...")
        game_id_map = get_game_id_map(start_year=years_to_sync[0])
        logger.info(f"Game ID map: {game_id_map}")

        success = []
        failed = []

        for year in years_to_sync:
            if year not in game_id_map:
                logger.warning(f"No game_id found for {year}, skipping.")
                continue
            if year not in league_id_map:
                logger.warning(f"No league_id found for {year} — run scripts/find_league_ids.py, skipping.")
                continue

            if not args.force:
                from app.models.sync_log import SyncLog
                existing = (
                    db.query(SyncLog)
                    .filter(SyncLog.season_year == year, SyncLog.status == "success", SyncLog.week == None)
                    .first()
                )
                if existing:
                    logger.info(f"Season {year} already synced (use --force to re-sync), skipping.")
                    continue

            logger.info(f"Syncing season {year} (game_id={game_id_map[year]}, league_id={league_id_map[year]})...")
            log_id_ref = []
            try:
                sync_season(db, year=year, game_id=game_id_map[year], league_id=league_id_map[year], log_id_ref=log_id_ref)
                success.append(year)
            except Exception as e:
                logger.error(f"Season {year} failed: {e}")
                failed.append(year)

        print(f"\n{'='*50}")
        print(f"Sync complete. Success: {success}. Failed: {failed}.")
        if failed:
            print(f"Re-run with --years {' '.join(map(str, failed))} --force to retry failed seasons.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
