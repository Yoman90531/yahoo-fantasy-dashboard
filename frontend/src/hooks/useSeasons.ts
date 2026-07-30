import { seasonsApi } from '../api/client'
import type { SeasonSummary } from '../types'
import { useApi } from './useApi'

export function useSeasons() {
  return useApi<SeasonSummary[]>(['seasons'], () => seasonsApi.list())
}
