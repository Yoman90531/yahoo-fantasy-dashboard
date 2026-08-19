from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.keeper import KeeperBoard
from app.services.keepers import build_keeper_board


router = APIRouter(prefix="/keepers", tags=["keepers"])


@router.get("/board", response_model=KeeperBoard)
def keeper_board(db: Session = Depends(get_db)):
    return build_keeper_board(db)

