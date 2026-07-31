from pydantic import BaseModel


class ManagerBase(BaseModel):
    yahoo_guid: str
    display_name: str
    nickname: str | None


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
    worst_finish: int | None
    average_finish: float | None
    median_finish: float | None
    finish_percentile: float | None
    top_three_finishes: int
    last_place_finishes: int
    playoff_rate: float
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
    num_teams: int | None
    finish_percentile: float | None

    model_config = {"from_attributes": True}


class ManagerPlacementSummary(BaseModel):
    placement_rank: int
    manager_id: int
    manager_name: str
    seasons_played: int
    ranked_seasons: int
    average_finish: float
    median_finish: float
    finish_percentile: float | None
    best_finish: int
    worst_finish: int
    championships: int
    runner_ups: int
    top_three_finishes: int
    top_three_rate: float
    last_place_finishes: int
    last_place_rate: float
    playoff_appearances: int
    playoff_rate: float


class ManagerOpponentIdentity(BaseModel):
    manager_id: int
    manager_name: str
    games: int
    wins: int
    losses: int
    ties: int
    win_pct: float
    points_for: float
    points_against: float
    point_diff: float


class ManagerSignatureSeason(BaseModel):
    year: int
    team_name: str | None
    final_finish: int
    finish_percentile: float | None
    wins: int
    losses: int
    ties: int
    points_for: float
    is_champion: bool


class ManagerBadge(BaseModel):
    key: str
    label: str
    icon: str
    description: str


class ManagerProfileSummary(BaseModel):
    placement: ManagerPlacementSummary
    favorite_opponent: ManagerOpponentIdentity | None
    nemesis: ManagerOpponentIdentity | None
    closest_rivalry: ManagerOpponentIdentity | None
    signature_season: ManagerSignatureSeason | None
    badges: list[ManagerBadge]


class ManagerProfile(BaseModel):
    manager: ManagerOut
    summary: ManagerProfileSummary | None
    season_history: list[ManagerSeasonRow]

    model_config = {"from_attributes": True}


class ManagerStreak(BaseModel):
    best_win_streak: int
    best_loss_streak: int
    current_streak_type: str
    current_streak_length: int
