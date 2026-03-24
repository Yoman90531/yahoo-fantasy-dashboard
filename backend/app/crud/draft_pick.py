from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert
from app.models.draft_pick import DraftPick


def upsert_draft_pick(
    db: Session,
    season_id: int,
    team_id: int,
    round: int,
    pick: int,
    player_name: str,
    position: str,
    player_key: str | None = None,
) -> None:
    stmt = (
        insert(DraftPick)
        .values(
            season_id=season_id,
            team_id=team_id,
            round=round,
            pick=pick,
            player_name=player_name,
            position=position,
            player_key=player_key,
        )
        .on_conflict_do_update(
            index_elements=["season_id", "round", "pick"],
            set_={
                "team_id": team_id,
                "player_name": player_name,
                "position": position,
                "player_key": player_key,
            },
        )
    )
    db.execute(stmt)


def get_by_season(db: Session, season_id: int) -> list[DraftPick]:
    return db.query(DraftPick).filter(DraftPick.season_id == season_id).order_by(DraftPick.pick).all()
