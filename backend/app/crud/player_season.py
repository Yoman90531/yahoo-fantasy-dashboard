from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert
from app.models.player_season import PlayerSeason


def upsert_player_season(
    db: Session,
    season_id: int,
    team_id: int,
    player_key: str,
    player_name: str,
    position: str,
    fantasy_points: float,
) -> None:
    stmt = (
        insert(PlayerSeason)
        .values(
            season_id=season_id,
            team_id=team_id,
            player_key=player_key,
            player_name=player_name,
            position=position,
            fantasy_points=fantasy_points,
        )
        .on_conflict_do_update(
            index_elements=["season_id", "player_key"],
            set_={
                "team_id": team_id,
                "player_name": player_name,
                "position": position,
                "fantasy_points": fantasy_points,
            },
        )
    )
    db.execute(stmt)


def get_by_season(db: Session, season_id: int) -> list[PlayerSeason]:
    return db.query(PlayerSeason).filter(PlayerSeason.season_id == season_id).order_by(PlayerSeason.fantasy_points.desc()).all()
