from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.team import Team
from app.models.season import Season
from app.schemas.manager import ManagerOut, ManagerStats, ManagerProfile, ManagerSeasonRow, ManagerStreak
from app.services import stats_engine
from app.services.stats.placements import (
    compute_manager_profile_summary,
    normalized_finish_percentile,
)
from app import crud

router = APIRouter(prefix="/managers", tags=["managers"])


@router.get("", response_model=list[ManagerStats])
def list_managers(db: Session = Depends(get_db)):
    records = stats_engine.compute_all_time_records(db)
    return [ManagerStats(**r) for r in records]


@router.get("/{manager_id}", response_model=ManagerProfile)
def get_manager(manager_id: int, db: Session = Depends(get_db)):
    mgr = crud.manager.get_by_id(db, manager_id)
    if not mgr:
        raise HTTPException(status_code=404, detail="Manager not found")

    teams = (
        db.query(Team)
        .options(joinedload(Team.season))
        .join(Season, Team.season_id == Season.id)
        .filter(Team.manager_id == manager_id)
        .order_by(Season.year)
        .all()
    )

    history = [
        ManagerSeasonRow(
            year=t.season.year,
            team_name=t.team_name,
            wins=t.wins,
            losses=t.losses,
            ties=t.ties,
            points_for=t.points_for,
            points_against=t.points_against,
            final_rank=t.final_rank,
            made_playoffs=t.made_playoffs,
            is_champion=t.is_champion,
            playoff_finish=t.playoff_finish,
            num_teams=t.season.num_teams,
            finish_percentile=normalized_finish_percentile(
                t.final_rank,
                t.season.num_teams,
            ),
        )
        for t in teams
    ]

    # Apply overrides
    stats_engine._apply_overrides([mgr])

    return ManagerProfile(
        manager=ManagerOut(id=mgr.id, yahoo_guid=mgr.yahoo_guid, display_name=mgr.display_name, nickname=mgr.nickname),
        summary=compute_manager_profile_summary(db, manager_id),
        season_history=history,
    )


@router.get("/{manager_id}/streak", response_model=ManagerStreak)
def get_manager_streak(manager_id: int, db: Session = Depends(get_db)):
    mgr = crud.manager.get_by_id(db, manager_id)
    if not mgr:
        raise HTTPException(status_code=404, detail="Manager not found")
    return stats_engine.compute_streaks(db, manager_id)
