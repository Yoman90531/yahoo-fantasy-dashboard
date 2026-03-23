import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export default api

export const seasonsApi = {
  list: () => api.get('/seasons').then(r => r.data),
  get: (year: number) => api.get(`/seasons/${year}`).then(r => r.data),
  matchups: (year: number, week?: number) =>
    api.get(`/seasons/${year}/matchups`, { params: week ? { week } : {} }).then(r => r.data),
}

export const managersApi = {
  list: () => api.get('/managers').then(r => r.data),
  get: (id: number) => api.get(`/managers/${id}`).then(r => r.data),
  streak: (id: number) => api.get(`/managers/${id}/streak`).then(r => r.data),
}

export const statsApi = {
  allTime: () => api.get('/stats/alltime').then(r => r.data),
  headToHead: () => api.get('/stats/headtohead').then(r => r.data),
  luckIndex: (year?: number) => api.get('/stats/luck-index', { params: year ? { year } : {} }).then(r => r.data),
  weeklyRecords: () => api.get('/stats/weekly-records').then(r => r.data),
  consistency: (year?: number) => api.get('/stats/consistency', { params: year ? { year } : {} }).then(r => r.data),
  pointsInflation: () => api.get('/stats/points-inflation').then(r => r.data),
  trophyCase: (managerId: number) => api.get(`/stats/trophy-case/${managerId}`).then(r => r.data),
  droughts: () => api.get('/stats/droughts').then(r => r.data),
  seasonScoring: () => api.get('/stats/season-scoring').then(r => r.data),
  scoreDistribution: () => api.get('/stats/score-distribution').then(r => r.data),
  weeklyFinishDistribution: () => api.get('/stats/weekly-finish-distribution').then(r => r.data),
  managerEras: () => api.get('/stats/manager-eras').then(r => r.data),
  throneTracker: () => api.get('/stats/throne-tracker').then(r => r.data),
  awards: (year?: number) => api.get('/stats/awards', { params: year ? { year } : {} }).then(r => r.data),
  powerRankings: (year?: number) => api.get('/stats/power-rankings', { params: year ? { year } : {} }).then(r => r.data),
  rivalry: (aId: number, bId: number) => api.get('/stats/rivalry', { params: { manager_a: aId, manager_b: bId } }).then(r => r.data),
}

export const syncApi = {
  status: () => api.get('/sync/status').then(r => r.data),
  log: () => api.get('/sync/log').then(r => r.data),
  run: (years?: number[], force?: boolean) =>
    api.post('/sync/run', null, { params: { ...(force ? { force: true } : {}), ...(years ? { years } : {}) } }).then(r => r.data),
}
