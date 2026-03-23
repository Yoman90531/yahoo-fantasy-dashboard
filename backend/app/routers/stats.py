from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services import stats_engine

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/alltime")
def all_time_stats(db: Session = Depends(get_db)):
    return stats_engine.compute_all_time_records(db)


@router.get("/headtohead")
def head_to_head(db: Session = Depends(get_db)):
    return stats_engine.compute_head_to_head(db)


@router.get("/luck-index")
def luck_index(year: int | None = Query(None), db: Session = Depends(get_db)):
    return stats_engine.compute_luck_index(db, year=year)


@router.get("/weekly-records")
def weekly_records(top_n: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    return stats_engine.compute_weekly_records(db, top_n=top_n)


@router.get("/consistency")
def consistency(year: int | None = Query(None), db: Session = Depends(get_db)):
    return stats_engine.compute_consistency(db, year=year)


@router.get("/points-inflation")
def points_inflation(db: Session = Depends(get_db)):
    return stats_engine.compute_points_inflation(db)


@router.get("/trophy-case/{manager_id}")
def trophy_case(manager_id: int, db: Session = Depends(get_db)):
    result = stats_engine.compute_trophy_case(db, manager_id)
    if result is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Manager not found")
    return result


@router.get("/droughts")
def droughts(db: Session = Depends(get_db)):
    return stats_engine.compute_droughts(db)


@router.get("/season-scoring")
def season_scoring(db: Session = Depends(get_db)):
    return stats_engine.compute_season_scoring(db)


@router.get("/score-distribution")
def score_distribution(db: Session = Depends(get_db)):
    return stats_engine.compute_score_distribution(db)


@router.get("/weekly-finish-distribution")
def weekly_finish_distribution(db: Session = Depends(get_db)):
    return stats_engine.compute_weekly_finish_distribution(db)


@router.get("/manager-eras")
def manager_eras(db: Session = Depends(get_db)):
    return stats_engine.compute_manager_eras(db)


@router.get("/throne-tracker")
def throne_tracker(db: Session = Depends(get_db)):
    return stats_engine.compute_throne_tracker(db)


@router.get("/awards")
def awards(year: int | None = Query(None), db: Session = Depends(get_db)):
    return stats_engine.compute_awards(db, year=year)


@router.get("/power-rankings")
def power_rankings(year: int | None = Query(None), db: Session = Depends(get_db)):
    return stats_engine.compute_power_rankings(db, year=year)


@router.get("/projection-performance")
def projection_performance(year: int | None = Query(None), db: Session = Depends(get_db)):
    return stats_engine.compute_projection_performance(db, year=year)


@router.get("/rivalry")
def rivalry(
    manager_a: int = Query(...),
    manager_b: int = Query(...),
    db: Session = Depends(get_db),
):
    from fastapi import HTTPException
    result = stats_engine.compute_rivalry(db, manager_a, manager_b)
    if result is None:
        raise HTTPException(status_code=404, detail="Manager not found")
    return result
