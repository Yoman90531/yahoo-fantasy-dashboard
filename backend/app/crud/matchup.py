from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert
from app.models.matchup import Matchup


def upsert_matchup(
    db: Session,
    season_id: int,
    week: int,
    team1_id: int,
    team2_id: int,
    team1_points: float,
    team2_points: float,
    winner_team_id: int | None,
    is_playoff: bool = False,
    is_championship: bool = False,
    is_consolation: bool = False,
    team1_projected: float | None = None,
    team2_projected: float | None = None,
) -> Matchup:
    # Normalize team order so team1_id < team2_id for consistent unique constraint
    if team1_id > team2_id:
        team1_id, team2_id = team2_id, team1_id
        team1_points, team2_points = team2_points, team1_points
        team1_projected, team2_projected = team2_projected, team1_projected

    stmt = (
        insert(Matchup)
        .values(
            season_id=season_id,
            week=week,
            team1_id=team1_id,
            team2_id=team2_id,
            team1_points=team1_points,
            team2_points=team2_points,
            team1_projected=team1_projected,
            team2_projected=team2_projected,
            winner_team_id=winner_team_id,
            is_playoff=is_playoff,
            is_championship=is_championship,
            is_consolation=is_consolation,
        )
        .on_conflict_do_update(
            index_elements=["season_id", "week", "team1_id", "team2_id"],
            set_={
                "team1_points": team1_points,
                "team2_points": team2_points,
                "team1_projected": team1_projected,
                "team2_projected": team2_projected,
                "winner_team_id": winner_team_id,
                "is_playoff": is_playoff,
                "is_championship": is_championship,
                "is_consolation": is_consolation,
            },
        )
    )
    db.execute(stmt)
    db.flush()
    return (
        db.query(Matchup)
        .filter(
            Matchup.season_id == season_id,
            Matchup.week == week,
            Matchup.team1_id == team1_id,
            Matchup.team2_id == team2_id,
        )
        .one()
    )


def get_by_season(db: Session, season_id: int) -> list[Matchup]:
    return db.query(Matchup).filter(Matchup.season_id == season_id).order_by(Matchup.week).all()


def get_by_season_week(db: Session, season_id: int, week: int) -> list[Matchup]:
    return (
        db.query(Matchup)
        .filter(Matchup.season_id == season_id, Matchup.week == week)
        .all()
    )
