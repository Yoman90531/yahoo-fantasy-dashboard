"""
Yahoo Fantasy Sports data sync service.
Pulls historical season data using YFPY and stores it in SQLite.

Key design decisions:
- One YahooFantasySportsQuery instance per season (league_key is season-specific)
- manager.guid is the identity key — not team name, which changes year to year
- 0.5s sleep between weekly API calls to stay under Yahoo's undocumented rate limit
- 3-retry exponential backoff on each call (0.5s → 2s → 8s)
- Token is re-persisted after each season to survive the 1-hour expiry during long syncs
"""
import time
import logging
from pathlib import Path
from sqlalchemy.orm import Session
from app.config import settings
from app import crud

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


def _make_query(game_id: int, league_id: str):
    """Instantiate a per-season YFPY query object."""
    from yfpy.query import YahooFantasySportsQuery

    return YahooFantasySportsQuery(
        league_id=league_id,
        game_id=game_id,
        game_code="nfl",
        yahoo_consumer_key=settings.yahoo_client_id,
        yahoo_consumer_secret=settings.yahoo_client_secret,
        env_file_location=DATA_DIR,
        save_token_data_to_env_file=True,
    )


def _retry(fn, *args, retries: int = 3, **kwargs):
    """Call fn with exponential backoff on failure."""
    delays = [0.5, 2.0, 8.0]
    last_exc = None
    for attempt in range(retries):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            last_exc = exc
            logger.warning(f"Attempt {attempt + 1}/{retries} failed: {exc}")
            if attempt < retries - 1:
                time.sleep(delays[attempt])
    raise last_exc


def _persist_token(query) -> None:
    """No-op: YFPY auto-persists tokens via auth_dir."""
    pass


def get_game_id_map(start_year: int) -> dict[int, int]:
    """
    Returns {year: game_id} for all NFL Fantasy seasons from start_year onward.
    Uses the most recent season's query object to fetch the full game key list.
    """
    from yfpy.query import YahooFantasySportsQuery

    query = YahooFantasySportsQuery(
        league_id=settings.league_id,
        game_code="nfl",
        yahoo_consumer_key=settings.yahoo_client_id,
        yahoo_consumer_secret=settings.yahoo_client_secret,
        env_file_location=DATA_DIR,
        save_token_data_to_env_file=True,
    )
    all_keys = _retry(query.get_all_yahoo_fantasy_game_keys)

    game_id_map = {}
    for key in all_keys:
        season = int(key.season)
        gid = int(key.game_id)
        if season >= start_year:
            game_id_map[season] = gid

    return game_id_map


def _safe_float(val, default: float = 0.0) -> float:
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _safe_int(val, default: int = 0) -> int:
    try:
        return int(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def sync_season(db: Session, year: int, game_id: int, league_id: str, log_id_ref: list) -> None:
    """Sync a single season: metadata, teams, standings, and all weekly matchups."""
    from app.models.sync_log import SyncLog
    from datetime import datetime

    log = SyncLog(season_year=year, status="in_progress")
    db.add(log)
    db.commit()
    log_id_ref.append(log.id)

    try:
        query = _make_query(game_id, league_id)

        # --- Season metadata ---
        league_info = _retry(query.get_league_info)
        settings_obj = getattr(league_info, "settings", None)
        num_teams = _safe_int(getattr(settings_obj, "num_teams", None))
        num_playoff_teams = _safe_int(getattr(settings_obj, "num_playoff_teams", None))
        playoff_start_week = _safe_int(getattr(settings_obj, "playoff_start_week", None), default=14)
        num_regular_season_weeks = playoff_start_week - 1 if playoff_start_week else None
        raw_league_name = getattr(league_info, "name", None)
        if isinstance(raw_league_name, bytes):
            league_name = raw_league_name.decode()
        else:
            league_name = str(raw_league_name) if raw_league_name else None

        season = crud.season.upsert_season(
            db,
            year=year,
            game_id=game_id,
            league_id=league_id,
            league_name=league_name,
            num_teams=num_teams or None,
            num_playoff_teams=num_playoff_teams or None,
            num_regular_season_weeks=num_regular_season_weeks,
        )

        # --- Teams + managers from standings ---
        standings_data = _retry(query.get_league_standings)
        standings_teams = getattr(standings_data, "teams", []) or []

        db_team_map: dict[int, int] = {}  # yahoo_team_id → db team.id

        for team_data in standings_teams:
            managers_list = getattr(team_data, "managers", []) or []
            if not managers_list:
                logger.warning(f"No managers found for team {team_data} in {year}, skipping")
                continue

            mgr_data = managers_list[0]
            yahoo_guid = str(getattr(mgr_data, "guid", "") or "")
            # If Yahoo hides the GUID, generate a stable per-season identifier
            # to avoid colliding all hidden managers into one DB record
            if not yahoo_guid or "--" in yahoo_guid:
                yahoo_team_id_tmp = _safe_int(getattr(team_data, "team_id", None))
                yahoo_guid = f"hidden_{game_id}_{yahoo_team_id_tmp}"
            display_name = str(getattr(mgr_data, "nickname", "") or getattr(mgr_data, "manager_id", yahoo_guid))

            manager = crud.manager.upsert_manager(db, yahoo_guid=yahoo_guid, display_name=display_name)

            yahoo_team_id = _safe_int(getattr(team_data, "team_id", None))
            yahoo_team_key = str(getattr(team_data, "team_key", ""))
            raw_name = getattr(team_data, "name", "") or ""
            team_name = raw_name.decode() if isinstance(raw_name, bytes) else str(raw_name)

            db_team = crud.team.upsert_team(
                db,
                season_id=season.id,
                manager_id=manager.id,
                yahoo_team_key=yahoo_team_key,
                yahoo_team_id=yahoo_team_id,
                team_name=team_name,
                final_rank=_safe_int(getattr(team_data, "rank", None)),
                wins=_safe_int(getattr(team_data, "wins", 0)),
                losses=_safe_int(getattr(team_data, "losses", 0)),
                ties=_safe_int(getattr(team_data, "ties", 0)),
                points_for=_safe_float(getattr(team_data, "points_for", 0.0)),
                points_against=_safe_float(getattr(team_data, "points_against", 0.0)),
            )
            db_team_map[yahoo_team_id] = db_team.id

        db.commit()

        # --- Weekly matchups ---
        total_weeks = (num_regular_season_weeks or 13) + (num_playoff_teams and 3 or 3)
        for week in range(1, total_weeks + 1):
            time.sleep(0.5)
            try:
                matchups = _retry(query.get_league_matchups_by_week, chosen_week=week)
            except Exception as e:
                logger.error(f"Failed to fetch week {week} for {year}: {e}")
                _log_week_error(db, year, week, str(e))
                continue

            for matchup in (matchups or []):
                teams_in_matchup = getattr(matchup, "teams", []) or []
                if len(teams_in_matchup) < 2:
                    continue

                t1 = teams_in_matchup[0]
                t2 = teams_in_matchup[1]

                t1_id = _safe_int(getattr(t1, "team_id", None))
                t2_id = _safe_int(getattr(t2, "team_id", None))
                t1_pts = _safe_float(getattr(t1, "team_points", {}).get("total", 0) if isinstance(getattr(t1, "team_points", None), dict) else getattr(getattr(t1, "team_points", None), "total", 0))
                t2_pts = _safe_float(getattr(t2, "team_points", {}).get("total", 0) if isinstance(getattr(t2, "team_points", None), dict) else getattr(getattr(t2, "team_points", None), "total", 0))
                t1_proj = _safe_float(getattr(t1, "projected_points", None)) or None
                t2_proj = _safe_float(getattr(t2, "projected_points", None)) or None

                db_t1 = db_team_map.get(t1_id)
                db_t2 = db_team_map.get(t2_id)
                if not db_t1 or not db_t2:
                    logger.warning(f"Unknown team ids {t1_id}/{t2_id} in {year} week {week}")
                    continue

                winner_db_id = None
                if t1_pts > t2_pts:
                    winner_db_id = db_t1
                elif t2_pts > t1_pts:
                    winner_db_id = db_t2

                is_playoff = bool(getattr(matchup, "is_playoffs", False))
                is_championship = bool(getattr(matchup, "is_championship", False))
                is_consolation = bool(getattr(matchup, "is_consolation", False))

                crud.matchup.upsert_matchup(
                    db,
                    season_id=season.id,
                    week=week,
                    team1_id=db_t1,
                    team2_id=db_t2,
                    team1_points=t1_pts,
                    team2_points=t2_pts,
                    winner_team_id=winner_db_id,
                    is_playoff=is_playoff,
                    is_championship=is_championship,
                    is_consolation=is_consolation,
                    team1_projected=t1_proj,
                    team2_projected=t2_proj,
                )

            db.commit()

        # Mark champion on teams + season
        _mark_champion(db, season)
        _mark_playoff_teams(db, season, num_playoff_teams or 4)
        db.commit()

        _persist_token(query)

        log.status = "success"
        log.synced_at = datetime.utcnow()
        db.commit()
        logger.info(f"Season {year} synced successfully.")

    except Exception as e:
        logger.error(f"Season {year} sync failed: {e}", exc_info=True)
        log.status = "error"
        log.error_msg = str(e)
        db.commit()
        raise


def _log_week_error(db: Session, year: int, week: int, error_msg: str) -> None:
    from app.models.sync_log import SyncLog
    entry = SyncLog(season_year=year, week=week, status="error", error_msg=error_msg)
    db.add(entry)
    db.commit()


def _mark_champion(db: Session, season) -> None:
    """Set is_champion on the team with final_rank=1 and link to season."""
    from app.models.team import Team
    champion = (
        db.query(Team)
        .filter(Team.season_id == season.id, Team.final_rank == 1)
        .first()
    )
    if champion:
        champion.is_champion = True
        champion.playoff_finish = 1
        season.champion_team_id = champion.id


def _mark_playoff_teams(db: Session, season, num_playoff_teams: int) -> None:
    """Mark the top N teams (by final_rank) as having made playoffs."""
    from app.models.team import Team
    from app.models.matchup import Matchup

    # Use actual playoff matchup participation — exclude consolation games
    playoff_team_ids = set()
    playoff_matchups = (
        db.query(Matchup)
        .filter(
            Matchup.season_id == season.id,
            Matchup.is_playoff == True,
            Matchup.is_consolation == False,
        )
        .all()
    )
    for m in playoff_matchups:
        playoff_team_ids.add(m.team1_id)
        playoff_team_ids.add(m.team2_id)

    if playoff_team_ids:
        db.query(Team).filter(
            Team.season_id == season.id, Team.id.in_(playoff_team_ids)
        ).update({"made_playoffs": True}, synchronize_session=False)
    else:
        # Fallback: top N by rank
        db.query(Team).filter(
            Team.season_id == season.id,
            Team.final_rank <= num_playoff_teams,
        ).update({"made_playoffs": True}, synchronize_session=False)
