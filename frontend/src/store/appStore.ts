import { create } from 'zustand'
import type { SeasonSummary, ManagerStats } from '../types'

interface AppStore {
  seasons: SeasonSummary[]
  managers: ManagerStats[]
  selectedYear: number | null
  setSeasons: (s: SeasonSummary[]) => void
  setManagers: (m: ManagerStats[]) => void
  setSelectedYear: (y: number | null) => void
}

export const useAppStore = create<AppStore>(set => ({
  seasons: [],
  managers: [],
  selectedYear: null,
  setSeasons: seasons => set({ seasons }),
  setManagers: managers => set({ managers }),
  setSelectedYear: year => set({ selectedYear: year }),
}))
