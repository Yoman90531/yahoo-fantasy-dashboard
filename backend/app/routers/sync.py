from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.sync_log import SyncLog
from app.models.season import Season

router = APIRouter(prefix="/sync", tags=["sync"])


@router.get("/status")
def sync_status(db: Session = Depends(get_db)):
    from sqlalchemy import func
    subq = (
        db.query(
            SyncLog.season_year,
            func.max(SyncLog.synced_at).label("latest"),
        )
        .filter(SyncLog.week == None)
        .group_by(SyncLog.season_year)
        .subquery()
    )
    rows = (
        db.query(SyncLog)
        .join(subq, (SyncLog.season_year == subq.c.season_year) & (SyncLog.synced_at == subq.c.latest))
        .filter(SyncLog.week == None)
        .order_by(SyncLog.season_year)
        .all()
    )
    return [
        {
            "season_year": r.season_year,
            "status": r.status,
            "synced_at": r.synced_at.isoformat() if r.synced_at else None,
            "error_msg": r.error_msg,
        }
        for r in rows
    ]


@router.get("/log")
def sync_log(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(SyncLog).order_by(SyncLog.synced_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "season_year": l.season_year,
            "week": l.week,
            "status": l.status,
            "synced_at": l.synced_at.isoformat() if l.synced_at else None,
            "error_msg": l.error_msg,
        }
        for l in logs
    ]


def _run_sync_task(years: list[int], force: bool):
    """Background task: runs sync for given years."""
    import logging
    from app.database import SessionLocal
    from app.services.yahoo_sync import get_game_id_map, sync_season
    from app.config import settings

    logger = logging.getLogger(__name__)
    db = SessionLocal()
    try:
        game_id_map = get_game_id_map(start_year=min(years))
        for year in years:
            if year not in game_id_map:
                logger.warning(f"No game_id for {year}, skipping.")
                continue
            if not force:
                existing = (
                    db.query(SyncLog)
                    .filter(SyncLog.season_year == year, SyncLog.status == "success", SyncLog.week == None)
                    .first()
                )
                if existing:
                    continue
            try:
                sync_season(db, year=year, game_id=game_id_map[year], log_id_ref=[])
            except Exception as e:
                logger.error(f"Sync failed for {year}: {e}")
    finally:
        db.close()


@router.post("/run")
def trigger_sync(
    background_tasks: BackgroundTasks,
    years: list[int] | None = None,
    force: bool = False,
    db: Session = Depends(get_db),
):
    from datetime import datetime
    from app.config import settings

    if not years:
        all_seasons = db.query(Season.year).order_by(Season.year).all()
        if all_seasons:
            years = [s.year for s in all_seasons]
        else:
            from datetime import datetime
            years = list(range(settings.league_start_year, datetime.now().year + 1))

    background_tasks.add_task(_run_sync_task, years, force)
    return {"message": f"Sync started for years {years}", "years": years}
