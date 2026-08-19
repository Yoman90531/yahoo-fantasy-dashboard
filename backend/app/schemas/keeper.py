from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class KeeperRules(BaseModel):
    season: int
    source_season: int
    league_size: int
    draft_rounds: int
    scoring_format: str
    adp_source: str
    adp_url: str
    recap: list[str]


class KeeperTeam(BaseModel):
    key: str
    name: str
    team_name: str | None
    is_expansion: bool
    round_capacities: dict[int, int]


class KeeperAdpSnapshot(BaseModel):
    id: int
    source: str
    source_url: str | None
    captured_at: datetime
    player_count: int
    is_locked: bool


class KeeperAdpPlayer(BaseModel):
    rank: int
    player_name: str
    position: str | None
    nfl_team: str | None
    average_adp: float | None
    adp_round: int


class KeeperCandidate(BaseModel):
    candidate_id: str
    yahoo_player_id: str | None
    player_name: str
    position: str
    nfl_team: str | None
    roster_team_key: str
    roster_team_name: str | None
    manager_name: str
    draft_round: int | None
    draft_pick: int | None
    acquisition_label: str
    kept_previous_year: bool | None
    consecutive_keeper_years: int | None
    is_dynasty: bool | None
    dynasty_year: int | None
    dynasty_locked_round: int | None
    history_known: bool
    eligibility_status: Literal["eligible", "ineligible", "review"]
    eligibility_reason: str
    adp_rank: int | None
    adp_round: int | None
    average_adp: float | None
    base_keeper_round: int | None
    value_rounds: int | None
    value_rating: str


class KeeperBoard(BaseModel):
    rules: KeeperRules
    teams: list[KeeperTeam]
    candidates: list[KeeperCandidate]
    adp_snapshot: KeeperAdpSnapshot | None
    adp_players: list[KeeperAdpPlayer]
    data_warnings: list[str]
