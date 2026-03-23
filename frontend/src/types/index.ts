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
  team2_manager_id: number
  team2_manager_name: string
  team2_team_name: string | null
  team2_points: number
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
