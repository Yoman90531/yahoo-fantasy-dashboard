from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert
from app.models.season import Season


def upsert_season(
    db: Session,
    year: int,
    game_id: int,
    league_id: str,
    league_name: str | None = None,
    num_teams: int | None = None,
    num_playoff_teams: int | None = None,
    num_regular_season_weeks: int | None = None,
) -> Season:
    stmt = (
        insert(Season)
        .values(
            year=year,
            game_id=game_id,
            league_id=league_id,
            league_name=league_name,
            num_teams=num_teams,
            num_playoff_teams=num_playoff_teams,
            num_regular_season_weeks=num_regular_season_weeks,
        )
        .on_conflict_do_update(
            index_elements=["year"],
            set_={
                "game_id": game_id,
                "league_id": league_id,
                "league_name": league_name,
                "num_teams": num_teams,
                "num_playoff_teams": num_playoff_teams,
                "num_regular_season_weeks": num_regular_season_weeks,
            },
        )
    )
    db.execute(stmt)
    db.flush()
    return db.query(Season).filter(Season.year == year).one()


def get_all(db: Session) -> list[Season]:
    return db.query(Season).order_by(Season.year).all()


def get_by_year(db: Session, year: int) -> Season | None:
    return db.query(Season).filter(Season.year == year).first()
