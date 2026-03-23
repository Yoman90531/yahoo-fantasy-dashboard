import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper'
import StatCard from '../components/cards/StatCard'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import InflationChart from '../components/charts/InflationChart'
import ScoringOverTimeChart from '../components/charts/ScoringOverTimeChart'
import { useApi } from '../hooks/useApi'
import { useAppStore } from '../store/appStore'
import { seasonsApi, managersApi, statsApi } from '../api/client'
import type { SeasonScoringData } from '../types'

export default function Dashboard() {
  const { seasons, setSeasons, managers, setManagers } = useAppStore()
  const { data: inflation, loading: iLoading, error: iError } = useApi(() => statsApi.pointsInflation(), [])
  const { data: scoring } = useApi<SeasonScoringData>(() => statsApi.seasonScoring(), [])
  const { data: droughts } = useApi(() => statsApi.droughts(), [])
  const { data: weekly } = useApi(() => statsApi.weeklyRecords(), [])

  useEffect(() => {
    if (!seasons.length) seasonsApi.list().then(setSeasons)
    if (!managers.length) managersApi.list().then(setManagers)
  }, [])

  const latestSeason = seasons[seasons.length - 1]
  const mostChamps = managers[0]
  const highScore = weekly?.highest_score?.[0]
  const lowScore = weekly?.lowest_score?.[0]
  const longestDrought = droughts?.[0]

  return (
    <PageWrapper title="GARYS Fantasy Dashboard" subtitle={`${seasons.length} seasons of data`}>
      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Current Champion"
          value={latestSeason?.champion_name ?? '—'}
          sub={latestSeason ? `${latestSeason.year} season` : ''}
          accent
        />
        <StatCard
          label="Most Championships"
          value={mostChamps ? `${mostChamps.display_name} (${mostChamps.championships})` : '—'}
          sub="all time"
        />
        <StatCard
          label="Highest Score Ever"
          value={highScore ? highScore.points.toFixed(2) : '—'}
          sub={highScore ? `${highScore.manager_name}, ${highScore.year} Wk ${highScore.week}` : ''}
        />
        <StatCard
          label="Lowest Score Ever"
          value={lowScore ? lowScore.points.toFixed(2) : '—'}
          sub={lowScore ? `${lowScore.manager_name}, ${lowScore.year} Wk ${lowScore.week}` : ''}
        />
        <StatCard
          label="Longest Drought"
          value={longestDrought ? `${longestDrought.manager_name}` : '—'}
          sub={longestDrought?.last_championship_year ? `Last won ${longestDrought.last_championship_year}` : 'Never won'}
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-6">
        {[
          { to: '/seasons', label: 'Standings & Seasons', icon: '📅', desc: 'Standings & results by year' },
          { to: '/headtohead', label: 'Head-to-Head', icon: '⚔️', desc: 'All-time matchup records' },
          { to: '/power-rankings', label: 'Power Rankings', icon: '👑', desc: 'Composite manager ratings' },
          { to: '/manager-tiers', label: 'Manager Tiers', icon: '🏷️', desc: 'Elite, contender, or rebuilding?' },
          { to: '/season-replay', label: 'Season Replay', icon: '📋', desc: 'Browse every matchup by week' },
          { to: '/awards', label: 'Awards', icon: '🏅', desc: 'Season superlatives & records' },
        ].map(l => (
          <Link
            key={l.to}
            to={l.to}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-brand-700 hover:bg-gray-800 transition-all group"
          >
            <div className="text-2xl mb-2">{l.icon}</div>
            <div className="font-semibold text-white group-hover:text-brand-300 text-sm">{l.label}</div>
            <div className="text-gray-500 text-xs mt-1">{l.desc}</div>
          </Link>
        ))}
      </div>

      {/* League avg scoring trend */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
          League Avg & Max Weekly Score Over Time
        </h2>
        {iLoading && <LoadingSpinner />}
        {iError && <ErrorMessage message={iError} />}
        {inflation && <InflationChart data={inflation} />}
      </div>

      {/* Per-manager season PF over time */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
          Avg Weekly Score — All Managers Over Time
        </h2>
        {scoring && inflation
          ? <ScoringOverTimeChart scoring={scoring} inflation={inflation} />
          : <LoadingSpinner />}
      </div>
    </PageWrapper>
  )
}
