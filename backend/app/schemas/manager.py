from pydantic import BaseModel


class ManagerBase(BaseModel):
    yahoo_guid: str
    display_name: str
    nickname: str | None = None


class ManagerOut(ManagerBase):
    id: int

    model_config = {"from_attributes": True}


class ManagerStats(BaseModel):
    id: int
    display_name: str
    nickname: str | None
    seasons_played: int
    total_wins: int
    total_losses: int
    total_ties: int
    win_pct: float
    total_points_for: float
    total_points_against: float
    pf_pa_ratio: float
    championships: int
    runner_ups: int
    playoff_appearances: int
    best_finish: int | None
    current_drought: int  # seasons since last championship

    model_config = {"from_attributes": True}


class ManagerSeasonRow(BaseModel):
    year: int
    team_name: str | None
    wins: int
    losses: int
    ties: int
    points_for: float
    points_against: float
    final_rank: int | None
    made_playoffs: bool
    is_champion: bool
    playoff_finish: int | None

    model_config = {"from_attributes": True}


class ManagerProfile(BaseModel):
    manager: ManagerOut
    season_history: list[ManagerSeasonRow]

    model_config = {"from_attributes": True}
