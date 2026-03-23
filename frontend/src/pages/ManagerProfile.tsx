import { useParams, Link } from 'react-router-dom'
import PageWrapper from '../components/layout/PageWrapper'
import StatCard from '../components/cards/StatCard'
import PointsLineChart from '../components/charts/PointsLineChart'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { managersApi, statsApi } from '../api/client'
import type { ManagerProfile as MgrProfile, ManagerStats } from '../types'

export default function ManagerProfile() {
  const { id } = useParams<{ id: string }>()
  const managerId = Number(id)

  const { data: profile, loading, error } = useApi<MgrProfile>(() => managersApi.get(managerId), [managerId])
  const { data: allTime } = useApi<ManagerStats[]>(() => managersApi.list(), [])
  const { data: streak } = useApi(() => managersApi.streak(managerId), [managerId])
  const { data: trophy } = useApi(() => statsApi.trophyCase(managerId), [managerId])

  const myStats = allTime?.find(m => m.id === managerId)

  const lineData = profile?.season_history.map(s => ({
    year: s.year,
    points_for: s.points_for,
    wins: s.wins,
  })) ?? []

  if (loading) return <PageWrapper title="Manager Profile"><LoadingSpinner /></PageWrapper>
  if (error) return <PageWrapper title="Manager Profile"><ErrorMessage message={error} /></PageWrapper>
  if (!profile) return null

  const { manager, season_history } = profile

  return (
    <PageWrapper title={manager.display_name} subtitle={manager.nickname ? `"${manager.nickname}"` : undefined}>
      {/* Headline stats */}
      {myStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Championships" value={myStats.championships || '0'} accent={myStats.championships > 0} />
          <StatCard label="Win Rate" value={`${(myStats.win_pct * 100).toFixed(1)}%`} sub={`${myStats.total_wins}–${myStats.total_losses}`} />
          <StatCard label="Playoff Appearances" value={myStats.playoff_appearances} sub={`of ${myStats.seasons_played} seasons`} />
          <StatCard label="Drought" value={`${myStats.current_drought} yrs`} sub={trophy?.championships?.length ? `Last: ${trophy.championships[trophy.championships.length - 1]}` : 'Never won'} />
        </div>
      )}

      {/* Streak badges */}
      {streak && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-full px-4 py-1.5 text-sm text-gray-300">
            Current: <span className={`font-bold ${streak.current_streak_type === 'W' ? 'text-green-400' : 'text-red-400'}`}>{streak.current_streak_length}{streak.current_streak_type}</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-full px-4 py-1.5 text-sm text-gray-300">
            Best win streak: <span className="font-bold text-green-400">{streak.best_win_streak}</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-full px-4 py-1.5 text-sm text-gray-300">
            Worst loss streak: <span className="font-bold text-red-400">{streak.best_loss_streak}</span>
          </div>
        </div>
      )}

      {/* Trophy badges */}
      {trophy && trophy.championships.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {trophy.championships.map((y: number) => (
            <span key={y} className="bg-amber-900 border border-amber-700 text-amber-300 text-xs font-bold px-3 py-1 rounded-full">🏆 {y}</span>
          ))}
          {trophy.runner_ups.map((y: number) => (
            <span key={y} className="bg-gray-800 border border-gray-600 text-gray-300 text-xs px-3 py-1 rounded-full">🥈 {y}</span>
          ))}
        </div>
      )}

      {/* Points trend */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Points Scored Per Season</h2>
        <PointsLineChart
          data={lineData}
          lines={[{ key: 'points_for', label: 'Points For' }]}
          yLabel="Points"
        />
      </div>

      {/* Season history table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Season History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Year</th>
              <th className="px-4 py-3 text-left">Team</th>
              <th className="px-4 py-3 text-right">W</th>
              <th className="px-4 py-3 text-right">L</th>
              <th className="px-4 py-3 text-right">PF</th>
              <th className="px-4 py-3 text-right">PA</th>
              <th className="px-4 py-3 text-right">Rank</th>
              <th className="px-4 py-3 text-center">Playoffs</th>
              <th className="px-4 py-3 text-center">Result</th>
            </tr>
          </thead>
          <tbody>
            {[...season_history].reverse().map(s => (
              <tr key={s.year} className={`border-t border-gray-800 hover:bg-gray-800 transition-colors ${s.is_champion ? 'bg-amber-950/20' : ''}`}>
                <td className="px-4 py-3 font-medium">
                  <Link to={`/seasons?year=${s.year}`} className="text-brand-400 hover:underline">{s.year}</Link>
                </td>
                <td className="px-4 py-3 text-gray-400">{s.team_name ?? '—'}</td>
                <td className="px-4 py-3 text-right text-green-400">{s.wins}</td>
                <td className="px-4 py-3 text-right text-red-400">{s.losses}</td>
                <td className="px-4 py-3 text-right">{s.points_for.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gray-400">{s.points_against.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gray-400">{s.final_rank ?? '—'}</td>
                <td className="px-4 py-3 text-center">{s.made_playoffs ? '✓' : ''}</td>
                <td className="px-4 py-3 text-center">
                  {s.is_champion ? '🏆' : s.playoff_finish === 2 ? '🥈' : s.playoff_finish ? `P${s.playoff_finish}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  )
}
