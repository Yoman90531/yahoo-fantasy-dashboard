import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi, seasonsApi } from '../api/client'
import type { PlayoffPerformanceRow, SeasonSummary } from '../types'

type SortKey = 'manager_name' | 'reg_win_pct' | 'playoff_win_pct' | 'delta_win_pct' | 'reg_avg_pts' | 'playoff_avg_pts' | 'delta_avg_pts' | 'playoff_games'

export default function PlayoffPerformance() {
  const [year, setYear] = useState<number | undefined>(undefined)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'delta_win_pct', dir: -1 })
  const { data: seasons } = useApi<SeasonSummary[]>(() => seasonsApi.list(), [])
  const { data, loading, error } = useApi<PlayoffPerformanceRow[]>(() => statsApi.playoffPerformance(year), [year])

  const toggle = (key: SortKey) =>
    setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'manager_name' ? 1 : -1 })

  const sorted = [...(data ?? [])].sort((a, b) => {
    if (sort.key === 'manager_name') return a.manager_name.localeCompare(b.manager_name) * sort.dir
    return ((a[sort.key] as number) - (b[sort.key] as number)) * sort.dir
  })

  const th = (label: string, key: SortKey, align: 'left' | 'right' = 'right') => (
    <th className={`px-4 py-3 text-${align} cursor-pointer hover:text-white select-none`} onClick={() => toggle(key)}>
      {label} {sort.key === key ? (sort.dir === -1 ? '\u2193' : '\u2191') : ''}
    </th>
  )

  const chartData = (data ?? []).map(r => ({
    name: r.manager_name.split(' ')[0],
    'Regular Season': r.reg_avg_pts,
    'Playoffs': r.playoff_avg_pts,
  }))

  return (
    <PageWrapper
      title="Playoff vs Regular Season"
      subtitle="How does each manager's playoff performance compare to their regular season? Positive delta = better in playoffs."
      dataScope="playoffs"
    >
      {/* Explainer */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6 text-sm text-gray-400">
        <span className="text-gray-200 font-medium">How it works: </span>
        We split each manager's matchups into regular season and playoff games (excluding consolation). Win rates and average scores are compared between the two, and the delta shows how much better (or worse) each manager performs when it matters most.
      </div>

      {/* Year filter */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-gray-400 text-sm">Filter by season:</label>
        <select
          value={year ?? ''}
          onChange={e => setYear(e.target.value ? Number(e.target.value) : undefined)}
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        >
          <option value="">All time</option>
          {[...(seasons ?? [])].reverse().map(s => (
            <option key={s.year} value={s.year}>{s.year}</option>
          ))}
        </select>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && (
        <>
          {/* Grouped bar chart — Reg vs Playoff avg points */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h3 className="text-gray-300 text-sm font-medium mb-3">Avg Points: Regular Season vs Playoffs</h3>
            <ResponsiveContainer width="100%" height={300}>
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
                  formatter={(v: number) => [v.toFixed(2), undefined]}
                />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                <Bar dataKey="Regular Season" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Playoffs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  {th('Manager', 'manager_name', 'left')}
                  {th('Reg Win%', 'reg_win_pct')}
                  {th('Playoff Win%', 'playoff_win_pct')}
                  {th('Win% Delta', 'delta_win_pct')}
                  {th('Reg Avg Pts', 'reg_avg_pts')}
                  {th('PO Avg Pts', 'playoff_avg_pts')}
                  {th('Pts Delta', 'delta_avg_pts')}
                  {th('PO Games', 'playoff_games')}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.manager_id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.manager_name}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{r.reg_win_pct.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-gray-400">{r.playoff_win_pct.toFixed(1)}%</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.delta_win_pct > 0 ? 'text-green-400' : r.delta_win_pct < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {r.delta_win_pct > 0 ? '+' : ''}{r.delta_win_pct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{r.reg_avg_pts.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{r.playoff_avg_pts.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.delta_avg_pts > 0 ? 'text-green-400' : r.delta_avg_pts < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {r.delta_avg_pts > 0 ? '+' : ''}{r.delta_avg_pts.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">{r.playoff_games}</td>
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
