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
    game_id: int | None = None
    league_id: str | None = None
    team_a_yahoo_id: int | None = None
    team_b_yahoo_id: int | None = None

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


# ---------------------------------------------------------------------------
# Win Margins
# ---------------------------------------------------------------------------

class WinMarginRow(BaseModel):
    manager_id: int
    manager_name: str
    avg_win_margin: float
    avg_loss_margin: float
    blowout_wins: int
    close_wins: int
    blowout_losses: int
    close_losses: int
    biggest_win: float
    biggest_loss: float


# ---------------------------------------------------------------------------
# League Parity
# ---------------------------------------------------------------------------

class LeagueParityRow(BaseModel):
    year: int
    num_teams: int
    scoring_std_dev: float
    scoring_range: float
    record_spread: int
    avg_points_per_game: float
    closest_standings_gap: int
    gini_coefficient: float


# ---------------------------------------------------------------------------
# Consolation Bracket
# ---------------------------------------------------------------------------

class ConsolationRow(BaseModel):
    manager_id: int
    manager_name: str
    times_missed_playoffs: int
    consolation_games: int
    consolation_wins: int
    consolation_losses: int
    consolation_win_pct: float
    consolation_avg_points: float


# ---------------------------------------------------------------------------
# Playoff vs Regular Season Performance
# ---------------------------------------------------------------------------

class PlayoffPerformanceRow(BaseModel):
    manager_id: int
    manager_name: str
    reg_wins: int
    reg_losses: int
    reg_win_pct: float
    reg_avg_pts: float
    reg_games: int
    playoff_wins: int
    playoff_losses: int
    playoff_win_pct: float
    playoff_avg_pts: float
    playoff_games: int
    delta_win_pct: float
    delta_avg_pts: float


# ---------------------------------------------------------------------------
# Streak Tracker
# ---------------------------------------------------------------------------

class StreakRow(BaseModel):
    manager_id: int
    manager_name: str
    current_streak_type: str  # "W", "L", or "T"
    current_streak_length: int
    longest_win_streak: int
    longest_win_start_year: int | None
    longest_win_start_week: int | None
    longest_win_end_year: int | None
    longest_win_end_week: int | None
    longest_loss_streak: int
    longest_loss_start_year: int | None
    longest_loss_start_week: int | None
    longest_loss_end_year: int | None
    longest_loss_end_week: int | None


# ---------------------------------------------------------------------------
# Manager Tiers
# ---------------------------------------------------------------------------

class ManagerTierRow(BaseModel):
    manager_id: int
    manager_name: str
    tier: str  # "Elite", "Contender", "Middle of the Pack", "Rebuilding"
    composite_score: float
    win_pct: float
    avg_ppg: float
    championships: int
    playoff_rate: float
    consistency_score: float
    seasons_played: int


# ---------------------------------------------------------------------------
# Strength of Schedule
# ---------------------------------------------------------------------------

class StrengthOfScheduleRow(BaseModel):
    manager_id: int
    manager_name: str
    year: int | None  # None = all-time
    games: int
    actual_win_pct: float
    avg_opp_win_pct: float
    avg_opp_pf: float
    sos_rank: int
    adjusted_win_pct: float
    wins_above_expected: float
