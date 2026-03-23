export interface SeasonSummary {
  id: number
  year: number
  league_name: string | null
  num_teams: number | null
  champion_name: string | null
}

export interface StandingsRow {
  final_rank: number | null
  team_name: string | null
  manager_id: number
  manager_name: string
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
  made_playoffs: boolean
  is_champion: boolean
  playoff_finish: number | null
}

export interface SeasonDetail {
  id: number
  year: number
  league_name: string | null
  num_teams: number | null
  num_playoff_teams: number | null
  num_regular_season_weeks: number | null
  standings: StandingsRow[]
}

export interface ManagerStats {
  id: number
  display_name: string
  nickname: string | null
  seasons_played: number
  total_wins: number
  total_losses: number
  total_ties: number
  win_pct: number
  total_points_for: number
  total_points_against: number
  pf_pa_ratio: number
  championships: number
  runner_ups: number
  playoff_appearances: number
  best_finish: number | null
  current_drought: number
}

export interface ManagerSeasonRow {
  year: number
  team_name: string | null
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
  final_rank: number | null
  made_playoffs: boolean
  is_champion: boolean
  playoff_finish: number | null
}

export interface ManagerProfile {
  manager: {
    id: number
    yahoo_guid: string
    display_name: string
    nickname: string | null
  }
  season_history: ManagerSeasonRow[]
}

export interface MatchupOut {
  id: number
  season_year: number
  week: number
  team1_manager_id: number
  team1_manager_name: string
  team1_team_name: string | null
  team1_points: number
  team1_projected: number | null
  team2_manager_id: number
  team2_manager_name: string
  team2_team_name: string | null
  team2_points: number
  team2_projected: number | null
  winner_manager_id: number | null
  is_playoff: boolean
  is_championship: boolean
  margin: number
}

export interface H2HRecord {
  manager_a_id: number
  manager_a_name: string
  manager_b_id: number
  manager_b_name: string
  wins: number
  losses: number
  ties: number
  win_pct: number
  points_for: number
  points_against: number
}

export interface H2HMatrix {
  managers: { id: number; name: string }[]
  records: H2HRecord[]
}

export interface LuckIndexRow {
  manager_id: number
  manager_name: string
  year: number | null
  actual_wins: number
  expected_wins: number
  luck_score: number
}

export interface WeeklyRecordEntry {
  manager_id: number
  manager_name: string
  team_name: string | null
  year: number
  week: number
  points: number
  opponent_points: number | null
  opponent_manager_name: string | null
  margin?: number
}

export interface WeeklyRecords {
  highest_score: WeeklyRecordEntry[]
  lowest_score: WeeklyRecordEntry[]
  lowest_winning_score: WeeklyRecordEntry[]
  highest_losing_score: WeeklyRecordEntry[]
  biggest_blowout: WeeklyRecordEntry[]
  closest_games: WeeklyRecordEntry[]
}

export interface SeasonScoringData {
  managers: string[]
  seasons: Record<string, number | null>[]
}

export interface ConsistencyRow {
  manager_id: number
  manager_name: string
  year: number | null
  avg_score: number
  std_dev: number
  min_score: number
  max_score: number
}

export interface InflationPoint {
  year: number
  avg_weekly_score: number
  max_weekly_score: number
  min_weekly_score: number
}

export interface DroughtRow {
  manager_id: number
  manager_name: string
  last_championship_year: number | null
  seasons_since: number
  total_championships: number
}

export interface SyncStatusRow {
  season_year: number
  status: string
  synced_at: string | null
  error_msg: string | null
}

// Score Distribution
export interface ScoreDistributionRow {
  manager_id: number
  manager_name: string
  n: number
  min: number
  q1: number
  median: number
  q3: number
  max: number
  mean: number
  std_dev: number
  outliers: number[]
}

// Weekly Finish Distribution
export interface WeeklyFinishRow {
  manager_id: number
  manager_name: string
  total_weeks: number
  first: number
  top_three: number
  top_half: number
  bottom_half: number
  bottom_three: number
  last: number
  pct_first: number
  pct_top_three: number
  pct_top_half: number
  pct_last: number
  pct_bottom_three: number
}

// Manager Eras
export interface EraManagerRow {
  manager_id: number
  manager_name: string
  seasons: number
  wins: number
  losses: number
  win_pct: number
  avg_pf: number
  championships: number
  playoff_appearances: number
}

export interface EraBlock {
  era_name: string
  years: string
  num_seasons: number
  managers: EraManagerRow[]
}

// Throne Tracker
export interface ThroneEntry {
  year: number
  champion_id: number | null
  champion_name: string | null
}

export interface Dynasty {
  manager_name: string
  years: number[]
  count: number
}

export interface ThroneTracker {
  timeline: ThroneEntry[]
  dynasties: Dynasty[]
  most_titles: { manager_name: string | null; count: number }
  active_champion: string | null
}

// Awards
export interface Award {
  award_name: string
  icon: string
  manager_id: number
  manager_name: string
  value: string
  description: string
}

export interface SeasonAwards {
  year: number | null
  awards: Award[]
}

// Power Rankings
export interface PowerDimensions {
  win_rate: number
  scoring: number
  consistency: number
  luck_adjusted: number
  playoff_success: number
}

export interface PowerRankingRow {
  manager_id: number
  manager_name: string
  overall_score: number
  dimensions: PowerDimensions
}

// Rivalry
export interface RivalryMatchup {
  year: number
  week: number
  a_points: number
  b_points: number
  winner: 'a' | 'b' | 'tie'
  margin: number
  is_playoff: boolean
  game_id: number | null
  league_id: string | null
  team_a_yahoo_id: number | null
  team_b_yahoo_id: number | null
}

export interface RivalryTrend {
  year: number
  a_wins: number
  b_wins: number
  a_pf: number
  b_pf: number
}

export interface RivalryDetail {
  manager_a_id: number
  manager_a_name: string
  manager_b_id: number
  manager_b_name: string
  summary: {
    a_wins: number
    b_wins: number
    ties: number
    a_pf: number
    b_pf: number
    win_pct: number
  }
  matchups: RivalryMatchup[]
  trends: RivalryTrend[]
  current_streak: { holder: string; length: number }
  longest_streak: { holder: string; length: number }
  biggest_blowout: RivalryMatchup | null
  closest_game: RivalryMatchup | null
}

export interface WinMarginRow {
  manager_id: number
  manager_name: string
  avg_win_margin: number
  avg_loss_margin: number
  blowout_wins: number
  close_wins: number
  blowout_losses: number
  close_losses: number
  biggest_win: number
  biggest_loss: number
}

export interface ProjectionRow {
  manager_id: number
  manager_name: string
  weeks: number
  avg_actual: number
  avg_projected: number
  avg_diff: number
  beat_projection_pct: number
  std_dev_diff: number
  total_over: number
}

// League Parity
export interface LeagueParityRow {
  year: number
  num_teams: number
  scoring_std_dev: number
  scoring_range: number
  record_spread: number
  avg_points_per_game: number
  closest_standings_gap: number
  gini_coefficient: number
}

// Playoff vs Regular Season Performance
export interface PlayoffPerformanceRow {
  manager_id: number
  manager_name: string
  reg_wins: number
  reg_losses: number
  reg_win_pct: number
  reg_avg_pts: number
  reg_games: number
  playoff_wins: number
  playoff_losses: number
  playoff_win_pct: number
  playoff_avg_pts: number
  playoff_games: number
  delta_win_pct: number
  delta_avg_pts: number
}

export interface StreakRow {
  manager_id: number
  manager_name: string
  current_streak_type: string
  current_streak_length: number
  longest_win_streak: number
  longest_win_start_year: number | null
  longest_win_start_week: number | null
  longest_win_end_year: number | null
  longest_win_end_week: number | null
  longest_loss_streak: number
  longest_loss_start_year: number | null
  longest_loss_start_week: number | null
  longest_loss_end_year: number | null
  longest_loss_end_week: number | null
}

// Manager Tiers
export interface ManagerTierRow {
  manager_id: number
  manager_name: string
  tier: string
  composite_score: number
  win_pct: number
  avg_ppg: number
  championships: number
  playoff_rate: number
  consistency_score: number
  seasons_played: number
}

// Strength of Schedule
export interface StrengthOfScheduleRow {
  manager_id: number
  manager_name: string
  year: number | null
  games: number
  actual_win_pct: number
  avg_opp_win_pct: number
  avg_opp_pf: number
  sos_rank: number
  adjusted_win_pct: number
  wins_above_expected: number
}

// Consolation Bracket
export interface ConsolationRow {
  manager_id: number
  manager_name: string
  times_missed_playoffs: number
  consolation_games: number
  consolation_wins: number
  consolation_losses: number
  consolation_win_pct: number
  consolation_avg_points: number
}
