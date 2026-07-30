from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.sync_log import SyncLog
from app.schemas.sync import SyncLogResponse, SyncStatusResponse

router = APIRouter(prefix="/sync", tags=["sync"])


@router.get("/status", response_model=list[SyncStatusResponse])
def sync_status(db: Session = Depends(get_db)):
    from sqlalchemy import func
    subq = (
        db.query(
            SyncLog.season_year,
            func.max(SyncLog.synced_at).label("latest"),
        )
        .filter(SyncLog.week.is_(None))
        .group_by(SyncLog.season_year)
        .subquery()
    )
    rows = (
        db.query(SyncLog)
        .join(subq, (SyncLog.season_year == subq.c.season_year) & (SyncLog.synced_at == subq.c.latest))
        .filter(SyncLog.week.is_(None))
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


@router.get("/log", response_model=list[SyncLogResponse])
def sync_log(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
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
