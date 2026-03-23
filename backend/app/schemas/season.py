from pydantic import BaseModel


class SeasonSummary(BaseModel):
    id: int
    year: int
    league_name: str | None
    num_teams: int | None
    champion_name: str | None  # manager display_name of champion

    model_config = {"from_attributes": True}


class StandingsRow(BaseModel):
    final_rank: int | None
    team_name: str | None
    manager_id: int
    manager_name: str
    wins: int
    losses: int
    ties: int
    points_for: float
    points_against: float
    made_playoffs: bool
    is_champion: bool
    playoff_finish: int | None

    model_config = {"from_attributes": True}


class SeasonDetail(BaseModel):
    id: int
    year: int
    league_name: str | None
    num_teams: int | None
    num_playoff_teams: int | None
    num_regular_season_weeks: int | None
    standings: list[StandingsRow]

    model_config = {"from_attributes": True}
