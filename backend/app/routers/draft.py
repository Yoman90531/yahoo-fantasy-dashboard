from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services import stats_engine

router = APIRouter(prefix="/draft", tags=["draft"])


@router.get("/analysis")
def draft_analysis(year: int | None = Query(None), db: Session = Depends(get_db)):
    return stats_engine.compute_draft_analysis(db, year=year)
