from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.season import Season
from app.models.team import Team
from app.models.manager import Manager
from app.schemas.season import SeasonSummary, SeasonDetail, StandingsRow
from app.schemas.matchup import MatchupOut
from app import crud

router = APIRouter(prefix="/seasons", tags=["seasons"])


@router.get("", response_model=list[SeasonSummary])
def list_seasons(db: Session = Depends(get_db)):
    seasons = crud.season.get_all(db)
    result = []
    for s in seasons:
        champion_name = None
        if s.champion_team_id:
            champ_team = db.query(Team).filter(Team.id == s.champion_team_id).first()
            if champ_team:
                mgr = db.query(Manager).filter(Manager.id == champ_team.manager_id).first()
                champion_name = mgr.display_name if mgr else None
        result.append(SeasonSummary(
            id=s.id, year=s.year, league_name=s.league_name,
            num_teams=s.num_teams, champion_name=champion_name,
        ))
    return result


@router.get("/{year}", response_model=SeasonDetail)
def get_season(year: int, db: Session = Depends(get_db)):
    season = crud.season.get_by_year(db, year)
    if not season:
        raise HTTPException(status_code=404, detail=f"Season {year} not found")

    teams = crud.team.get_by_season(db, season.id)
    standings = []
    for t in sorted(teams, key=lambda x: (x.final_rank or 999)):
        mgr = db.query(Manager).filter(Manager.id == t.manager_id).first()
        standings.append(StandingsRow(
            final_rank=t.final_rank,
            team_name=t.team_name,
            manager_id=t.manager_id,
            manager_name=mgr.display_name if mgr else "Unknown",
            wins=t.wins,
            losses=t.losses,
            ties=t.ties,
            points_for=t.points_for,
            points_against=t.points_against,
            made_playoffs=t.made_playoffs,
            is_champion=t.is_champion,
            playoff_finish=t.playoff_finish,
        ))

    return SeasonDetail(
        id=season.id,
        year=season.year,
        league_name=season.league_name,
        num_teams=season.num_teams,
        num_playoff_teams=season.num_playoff_teams,
        num_regular_season_weeks=season.num_regular_season_weeks,
        standings=standings,
    )


@router.get("/{year}/matchups", response_model=list[MatchupOut])
def get_season_matchups(year: int, week: int | None = None, db: Session = Depends(get_db)):
    season = crud.season.get_by_year(db, year)
    if not season:
        raise HTTPException(status_code=404, detail=f"Season {year} not found")

    from app.models.matchup import Matchup
    q = db.query(Matchup).filter(Matchup.season_id == season.id)
    if week is not None:
        q = q.filter(Matchup.week == week)
    matchups = q.order_by(Matchup.week).all()

    teams = {t.id: t for t in crud.team.get_by_season(db, season.id)}
    managers = {m.id: m for m in db.query(Manager).all()}

    result = []
    for m in matchups:
        t1 = teams.get(m.team1_id)
        t2 = teams.get(m.team2_id)
        mgr1 = managers.get(t1.manager_id) if t1 else None
        mgr2 = managers.get(t2.manager_id) if t2 else None
        winner_team = teams.get(m.winner_team_id) if m.winner_team_id else None
        winner_mgr_id = winner_team.manager_id if winner_team else None
        result.append(MatchupOut(
            id=m.id,
            season_year=year,
            week=m.week,
            team1_manager_id=t1.manager_id if t1 else 0,
            team1_manager_name=mgr1.display_name if mgr1 else "Unknown",
            team1_team_name=t1.team_name if t1 else None,
            team1_points=m.team1_points,
            team2_manager_id=t2.manager_id if t2 else 0,
            team2_manager_name=mgr2.display_name if mgr2 else "Unknown",
            team2_team_name=t2.team_name if t2 else None,
            team2_points=m.team2_points,
            winner_manager_id=winner_mgr_id,
            is_playoff=m.is_playoff,
            is_championship=m.is_championship,
            margin=round(abs(m.team1_points - m.team2_points), 2),
        ))
    return result
