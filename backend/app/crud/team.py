from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert
from app.models.team import Team


def upsert_team(
    db: Session,
    season_id: int,
    manager_id: int,
    yahoo_team_key: str,
    yahoo_team_id: int,
    team_name: str | None = None,
    final_rank: int | None = None,
    wins: int = 0,
    losses: int = 0,
    ties: int = 0,
    points_for: float = 0.0,
    points_against: float = 0.0,
    made_playoffs: bool = False,
    is_champion: bool = False,
    playoff_finish: int | None = None,
) -> Team:
    stmt = (
        insert(Team)
        .values(
            season_id=season_id,
            manager_id=manager_id,
            yahoo_team_key=yahoo_team_key,
            yahoo_team_id=yahoo_team_id,
            team_name=team_name,
            final_rank=final_rank,
            wins=wins,
            losses=losses,
            ties=ties,
            points_for=points_for,
            points_against=points_against,
            made_playoffs=made_playoffs,
            is_champion=is_champion,
            playoff_finish=playoff_finish,
        )
        .on_conflict_do_update(
            index_elements=["season_id", "yahoo_team_id"],
            set_={
                "team_name": team_name,
                "final_rank": final_rank,
                "wins": wins,
                "losses": losses,
                "ties": ties,
                "points_for": points_for,
                "points_against": points_against,
                "made_playoffs": made_playoffs,
                "is_champion": is_champion,
                "playoff_finish": playoff_finish,
            },
        )
    )
    db.execute(stmt)
    db.flush()
    return (
        db.query(Team)
        .filter(Team.season_id == season_id, Team.yahoo_team_id == yahoo_team_id)
        .one()
    )


def get_by_season(db: Session, season_id: int) -> list[Team]:
    return db.query(Team).filter(Team.season_id == season_id).all()
