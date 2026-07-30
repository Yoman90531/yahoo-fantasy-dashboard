import { useEffect } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import StatCard from '../components/cards/StatCard'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import InflationChart from '../components/charts/InflationChart'
import ScoringOverTimeChart from '../components/charts/ScoringOverTimeChart'
import ChampionshipHistory from '../components/dashboard/ChampionshipHistory'
import AwardsSection from '../components/dashboard/AwardsSection'
import { useApi } from '../hooks/useApi'
import { useAppStore } from '../store/appStore'
import { seasonsApi, managersApi, statsApi } from '../api/client'
import type { DroughtRow, SeasonScoringData, WeeklyRecords } from '../types'

export default function Dashboard() {
  const { seasons, setSeasons, managers, setManagers } = useAppStore()
  const { data: inflation, loading: iLoading, error: iError } = useApi(() => statsApi.pointsInflation(), [])
  const { data: scoring } = useApi<SeasonScoringData>(() => statsApi.seasonScoring(), [])
  const { data: droughts } = useApi<DroughtRow[]>(() => statsApi.droughts(), [])
  const { data: weekly } = useApi<WeeklyRecords>(() => statsApi.weeklyRecords(), [])

  useEffect(() => {
    if (!seasons.length) seasonsApi.list().then(setSeasons)
    if (!managers.length) managersApi.list().then(setManagers)
  }, [])

  const latestSeason = seasons[seasons.length - 1]
  const championshipCount = Math.max(0, ...managers.map(manager => manager.championships))
  const championshipLeaders = managers.filter(
    manager => manager.championships === championshipCount && championshipCount > 0,
  )
  const highScore = weekly?.highest_score?.[0]
  const lowScore = weekly?.lowest_score?.[0]
  const longestDroughtLength = Math.max(0, ...(droughts ?? []).map(drought => drought.seasons_since))
  const longestDroughtManagers = (droughts ?? []).filter(
    drought => drought.seasons_since === longestDroughtLength,
  )

  return (
    <PageWrapper title="GARYS League HQ" subtitle={`${seasons.length} seasons of scores, grudges, and receipts.`}>
      <section aria-labelledby="league-snapshot-heading" className="mb-6">
        <h2 id="league-snapshot-heading" className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
          League Snapshot
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label="Current Champion"
            value={latestSeason?.champion_name ?? '-'}
            sub={latestSeason ? `${latestSeason.year} season` : ''}
            accent
          />
          <StatCard
            label="Most Championships"
            value={championshipLeaders.length > 0
              ? `${championshipLeaders.map(manager => manager.display_name).join(' & ')} (${championshipCount})`
              : '-'}
            sub="all time"
          />
          <StatCard
            label="Highest Score Ever"
            value={highScore ? highScore.points.toFixed(2) : '-'}
            sub={highScore ? `${highScore.manager_name}, ${highScore.year} Wk ${highScore.week}` : ''}
          />
          <StatCard
            label="Lowest Score Ever"
            value={lowScore ? lowScore.points.toFixed(2) : '-'}
            sub={lowScore ? `${lowScore.manager_name}, ${lowScore.year} Wk ${lowScore.week}` : ''}
          />
          <StatCard
            label="Longest Drought"
            value={longestDroughtManagers.length > 0
              ? longestDroughtManagers.map(drought => drought.manager_name).join(' & ')
              : '-'}
            sub={longestDroughtManagers.length > 0
              ? `${longestDroughtLength} seasons without a title`
              : undefined}
          />
        </div>
      </section>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
          Scoring by Era
        </h2>
        {iLoading && <LoadingSpinner />}
        {iError && <ErrorMessage message={iError} />}
        {inflation && <InflationChart data={inflation} />}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
          Manager Scoring Trends
        </h2>
        {scoring && inflation
          ? <ScoringOverTimeChart scoring={scoring} inflation={inflation} />
          : <LoadingSpinner />}
      </div>

      <ChampionshipHistory />
      <AwardsSection seasons={seasons} />
    </PageWrapper>
  )
}
