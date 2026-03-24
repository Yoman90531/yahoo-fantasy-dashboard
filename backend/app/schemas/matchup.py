from pydantic import BaseModel


class MatchupOut(BaseModel):
    id: int
    season_year: int
    week: int
    team1_manager_id: int
    team1_manager_name: str
    team1_team_name: str | None
    team1_points: float
    team1_projected: float | None
    team2_manager_id: int
    team2_manager_name: str
    team2_team_name: str | None
    team2_points: float
    team2_projected: float | None
    winner_manager_id: int | None
    is_playoff: bool
    is_championship: bool
    margin: float
    league_id: str | None = None
    team1_yahoo_id: int | None = None
    team2_yahoo_id: int | None = None

    model_config = {"from_attributes": True}
