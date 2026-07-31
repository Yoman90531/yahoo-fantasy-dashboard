import axios from 'axios'
import type { components } from '../types/api.generated'

const api = axios.create({ baseURL: '/fantasy/api' })

type Schema<Name extends keyof components['schemas']> = components['schemas'][Name]

export default api

export const seasonsApi = {
  list: () => api.get<Schema<'SeasonSummary'>[]>('/seasons').then(r => r.data),
  get: (year: number) => api.get<Schema<'SeasonDetail'>>(`/seasons/${year}`).then(r => r.data),
  matchups: (year: number, week?: number) =>
    api.get<Schema<'MatchupOut'>[]>(`/seasons/${year}/matchups`, { params: week ? { week } : {} }).then(r => r.data),
}

export const managersApi = {
  list: () => api.get<Schema<'ManagerStats'>[]>('/managers').then(r => r.data),
  get: (id: number) => api.get<Schema<'ManagerProfile'>>(`/managers/${id}`).then(r => r.data),
  streak: (id: number) => api.get<Schema<'ManagerStreak'>>(`/managers/${id}/streak`).then(r => r.data),
}

export const statsApi = {
  allTime: () => api.get<Schema<'ManagerStats'>[]>('/stats/alltime').then(r => r.data),
  headToHead: () => api.get<Schema<'H2HMatrix'>>('/stats/headtohead').then(r => r.data),
  luckIndex: (year?: number) => api.get<Schema<'LuckIndexRow'>[]>('/stats/luck-index', { params: year ? { year } : {} }).then(r => r.data),
  weeklyRecords: () => api.get<Schema<'WeeklyRecords'>>('/stats/weekly-records').then(r => r.data),
  consistency: (year?: number) => api.get<Schema<'ConsistencyRow'>[]>('/stats/consistency', { params: year ? { year } : {} }).then(r => r.data),
  pointsInflation: () => api.get<Schema<'InflationPoint'>[]>('/stats/points-inflation').then(r => r.data),
  trophyCase: (managerId: number) => api.get<Schema<'TrophyCase'>>(`/stats/trophy-case/${managerId}`).then(r => r.data),
  droughts: () => api.get<Schema<'DroughtRow'>[]>('/stats/droughts').then(r => r.data),
  seasonScoring: () => api.get<Schema<'SeasonScoringData'>>('/stats/season-scoring').then(r => r.data),
  scoreDistribution: () => api.get<Schema<'ScoreDistributionRow'>[]>('/stats/score-distribution').then(r => r.data),
  weeklyFinishDistribution: () => api.get<Schema<'WeeklyFinishRow'>[]>('/stats/weekly-finish-distribution').then(r => r.data),
  winMargins: (year?: number) => api.get<Schema<'WinMarginRow'>[]>('/stats/win-margins', { params: year ? { year } : {} }).then(r => r.data),
  projectionPerformance: (year?: number) => api.get<Schema<'ProjectionRow'>[]>('/stats/projection-performance', { params: year ? { year } : {} }).then(r => r.data),
  throneTracker: () => api.get<Schema<'ThroneTracker'>>('/stats/throne-tracker').then(r => r.data),
  awards: (year?: number) => api.get<Schema<'SeasonAwards'>>('/stats/awards', { params: year ? { year } : {} }).then(r => r.data),
  rivalry: (aId: number, bId: number) => api.get<Schema<'RivalryDetail'>>('/stats/rivalry', { params: { manager_a: aId, manager_b: bId } }).then(r => r.data),
  playoffPerformance: (year?: number) => api.get<Schema<'PlayoffPerformanceRow'>[]>('/stats/playoff-performance', { params: year ? { year } : {} }).then(r => r.data),
  leagueParity: () => api.get<Schema<'LeagueParityRow'>[]>('/stats/league-parity').then(r => r.data),
  streaks: () => api.get<Schema<'StreakRow'>[]>('/stats/streaks').then(r => r.data),
  consolation: (year?: number) => api.get<Schema<'ConsolationRow'>[]>('/stats/consolation', { params: year ? { year } : {} }).then(r => r.data),
  managerTiers: (yearStart?: number, yearEnd?: number) => api.get<Schema<'ManagerTierRow'>[]>('/stats/manager-tiers', { params: { ...(yearStart ? { year_start: yearStart } : {}), ...(yearEnd ? { year_end: yearEnd } : {}) } }).then(r => r.data),
  strengthOfSchedule: (year?: number) => api.get<Schema<'StrengthOfScheduleRow'>[]>('/stats/strength-of-schedule', { params: year ? { year } : {} }).then(r => r.data),
  managerPlacements: (yearStart?: number, yearEnd?: number) => api.get<Schema<'ManagerPlacementRow'>[]>('/stats/manager-placements', { params: { ...(yearStart ? { year_start: yearStart } : {}), ...(yearEnd ? { year_end: yearEnd } : {}) } }).then(r => r.data),
  insightRankings: (insightKey: string) => api.get<Schema<'InsightRankings'>>(`/stats/insight-rankings/${insightKey}`).then(r => r.data),
}

export const draftApi = {
  analysis: (year?: number) => api.get<Schema<'DraftAnalysis'>>('/draft/analysis', { params: year ? { year } : {} }).then(r => r.data),
}

export const feedbackApi = {
  list: () => api.get<Schema<'FeedbackResponse'>[]>('/feedback').then(r => r.data),
  create: (payload: Schema<'FeedbackCreate'>) =>
    api.post<Schema<'FeedbackResponse'>>('/feedback', payload).then(r => r.data),
}

export const syncApi = {
  status: () => api.get<Schema<'SyncStatusResponse'>[]>('/sync/status').then(r => r.data),
  log: () => api.get<Schema<'SyncLogResponse'>[]>('/sync/log').then(r => r.data),
}
