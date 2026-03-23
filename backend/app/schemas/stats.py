from pydantic import BaseModel


class H2HRecord(BaseModel):
    manager_a_id: int
    manager_a_name: str
    manager_b_id: int
    manager_b_name: str
    wins: int
    losses: int
    ties: int
    win_pct: float
    points_for: float
    points_against: float


class H2HMatrix(BaseModel):
    managers: list[dict]  # [{id, name}]
    records: list[H2HRecord]


class LuckIndexRow(BaseModel):
    manager_id: int
    manager_name: str
    year: int | None  # None = all-time
    actual_wins: int
    expected_wins: float
    luck_score: float  # actual - expected


class WeeklyRecordEntry(BaseModel):
    manager_id: int
    manager_name: str
    team_name: str | None
    year: int
    week: int
    points: float
    opponent_points: float | None
    opponent_manager_name: str | None


class WeeklyRecords(BaseModel):
    highest_score: list[WeeklyRecordEntry]
    lowest_winning_score: list[WeeklyRecordEntry]
    highest_losing_score: list[WeeklyRecordEntry]
    biggest_blowout: list[WeeklyRecordEntry]   # winner side
    closest_games: list[WeeklyRecordEntry]      # winner side


class ConsistencyRow(BaseModel):
    manager_id: int
    manager_name: str
    year: int | None
    avg_score: float
    std_dev: float
    min_score: float
    max_score: float


class InflationPoint(BaseModel):
    year: int
    avg_weekly_score: float
    max_weekly_score: float
    min_weekly_score: float


class TrophyCase(BaseModel):
    manager_id: int
    manager_name: str
    championships: list[int]       # list of years
    runner_ups: list[int]
    playoff_appearances: list[int]
    best_regular_season: int | None  # year with best W/L record


class DroughtRow(BaseModel):
    manager_id: int
    manager_name: str
    last_championship_year: int | None
    seasons_since: int  # 0 if won most recent season
    total_championships: int


class SyncStatusRow(BaseModel):
    season_year: int
    status: str
    synced_at: str | None
    error_msg: str | None


# ---------------------------------------------------------------------------
# Throne Tracker
# ---------------------------------------------------------------------------

class ThroneEntry(BaseModel):
    year: int
    champion_id: int | None
    champion_name: str | None

class Dynasty(BaseModel):
    manager_name: str
    years: list[int]
    count: int

class ThroneTracker(BaseModel):
    timeline: list[ThroneEntry]
    dynasties: list[Dynasty]
    most_titles: dict  # {manager_name, count}
    active_champion: str | None


# ---------------------------------------------------------------------------
# Awards
# ---------------------------------------------------------------------------

class Award(BaseModel):
    award_name: str
    icon: str
    manager_id: int
    manager_name: str
    value: str
    description: str

class SeasonAwards(BaseModel):
    year: int | None  # None = all-time
    awards: list[Award]


# ---------------------------------------------------------------------------
# Power Rankings
# ---------------------------------------------------------------------------

class PowerDimensions(BaseModel):
    win_rate: float
    scoring: float
    consistency: float
    luck_adjusted: float
    playoff_success: float

class PowerRankingRow(BaseModel):
    manager_id: int
    manager_name: str
    overall_score: float
    dimensions: PowerDimensions


# ---------------------------------------------------------------------------
# Rivalry
# ---------------------------------------------------------------------------

class RivalryMatchup(BaseModel):
    year: int
    week: int
    a_points: float
    b_points: float
    winner: str  # "a", "b", or "tie"
    margin: float
    is_playoff: bool

class RivalryTrend(BaseModel):
    year: int
    a_wins: int
    b_wins: int
    a_pf: float
    b_pf: float

class RivalrySummary(BaseModel):
    a_wins: int
    b_wins: int
    ties: int
    a_pf: float
    b_pf: float
    win_pct: float

class RivalryDetail(BaseModel):
    manager_a_id: int
    manager_a_name: str
    manager_b_id: int
    manager_b_name: str
    summary: RivalrySummary
    matchups: list[RivalryMatchup]
    trends: list[RivalryTrend]
    current_streak: dict  # {holder: "a"|"b", length: int}
    longest_streak: dict  # {holder: "a"|"b", length: int}
    biggest_blowout: RivalryMatchup | None
    closest_game: RivalryMatchup | None
