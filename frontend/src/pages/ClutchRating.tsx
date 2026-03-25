import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import YearFilter from '../components/cards/YearFilter'
import ExplainerCard from '../components/cards/ExplainerCard'
import StatCard from '../components/cards/StatCard'
import { useApi } from '../hooks/useApi'
import { useSortedTable } from '../hooks/useSortedTable'
import { statsApi, seasonsApi } from '../api/client'
import type { ClutchRatingRow, SeasonSummary } from '../types'

type SortKey = 'manager_name' | 'clutch_rating' | 'clutch_games' | 'clutch_win_pct' | 'clutch_avg_points' | 'scoring_boost'

export default function ClutchRating() {
  const [year, setYear] = useState<number | undefined>(undefined)
  const { data: seasons } = useApi<SeasonSummary[]>(() => seasonsApi.list(), [])
  const { data, loading, error } = useApi<ClutchRatingRow[]>(() => statsApi.clutchRating(year), [year])
  const { sorted, th } = useSortedTable<ClutchRatingRow, SortKey>(data, 'clutch_rating')

  const chartData = (data ?? [])
    .sort((a, b) => b.clutch_rating - a.clutch_rating)
    .map(r => ({
      name: r.manager_name.split(' ')[0],
      'Clutch Rating': r.clutch_rating,
    }))

  const mostClutch = data?.[0]
  const leastClutch = data && data.length > 0 ? data[data.length - 1] : null
  const mostGames = data ? [...data].sort((a, b) => b.clutch_games - a.clutch_games)[0] : null

  return (
    <PageWrapper
      title="Clutch Rating"
      subtitle="Who performs when it matters most? Rate managers on must-win games and playoff performance."
      dataScope="all"
    >
      <ExplainerCard>
        Clutch games include all playoff matchups plus late-season regular games (week 8+) where the manager
        is within 2 wins of the playoff cutline. Clutch Rating combines win% in these games (60%) with
        scoring boost vs regular games (40%).
      </ExplainerCard>

      <YearFilter seasons={seasons} year={year} onChange={setYear} />

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && data.length > 0 && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {mostClutch && (
              <StatCard
                label="Most Clutch"
                value={mostClutch.manager_name}
                sub={`Rating: ${mostClutch.clutch_rating.toFixed(1)}`}
              />
            )}
            {leastClutch && (
              <StatCard
                label="Biggest Choker"
                value={leastClutch.manager_name}
                sub={`Rating: ${leastClutch.clutch_rating.toFixed(1)}`}
              />
            )}
            {mostGames && (
              <StatCard
                label="Most Clutch Games"
                value={mostGames.manager_name}
                sub={`${mostGames.clutch_games} games`}
              />
            )}
          </div>

          {/* Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Clutch Rating by Manager</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#f3f4f6' }}
                  formatter={(v: number) => v.toFixed(1)}
                />
                <Bar dataKey="Clutch Rating" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  {th('Manager', 'manager_name', 'left')}
                  {th('Rating', 'clutch_rating')}
                  {th('Clutch G', 'clutch_games')}
                  {th('Clutch W%', 'clutch_win_pct')}
                  {th('Clutch PPG', 'clutch_avg_points')}
                  {th('Scoring Boost', 'scoring_boost')}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.manager_id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.manager_name}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-400">{r.clutch_rating.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{r.clutch_games}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{r.clutch_win_pct.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-gray-300">{r.clutch_avg_points.toFixed(1)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.scoring_boost > 0 ? 'text-green-400' : r.scoring_boost < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {r.scoring_boost > 0 ? '+' : ''}{r.scoring_boost.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageWrapper>
  )
}
