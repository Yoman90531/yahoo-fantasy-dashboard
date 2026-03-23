import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi, seasonsApi } from '../api/client'
import type { ProjectionRow, SeasonSummary } from '../types'

type SortKey = 'manager_name' | 'avg_diff' | 'avg_actual' | 'avg_projected' | 'beat_projection_pct' | 'std_dev_diff' | 'total_over' | 'weeks'

export default function ProjectionPerformance() {
  const [year, setYear] = useState<number | undefined>(undefined)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'avg_diff', dir: -1 })
  const { data: seasons } = useApi<SeasonSummary[]>(() => seasonsApi.list(), [])
  const { data, loading, error } = useApi<ProjectionRow[]>(() => statsApi.projectionPerformance(year), [year])

  const toggle = (key: SortKey) =>
    setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'manager_name' ? 1 : -1 })

  const sorted = [...(data ?? [])].sort((a, b) => {
    if (sort.key === 'manager_name') return a.manager_name.localeCompare(b.manager_name) * sort.dir
    return ((a[sort.key] as number) - (b[sort.key] as number)) * sort.dir
  })

  const th = (label: string, key: SortKey, align: 'left' | 'right' = 'right') => (
    <th className={`px-4 py-3 text-${align} cursor-pointer hover:text-white select-none`} onClick={() => toggle(key)}>
      {label} {sort.key === key ? (sort.dir === -1 ? '↓' : '↑') : ''}
    </th>
  )

  const chartData = (data ?? [])
    .map(d => ({ name: d.manager_name, diff: d.avg_diff }))
    .sort((a, b) => b.diff - a.diff)

  return (
    <PageWrapper
      title="Projection Performance"
      subtitle="How often does each manager outperform (or underperform) Yahoo's pre-game point projections? Regular season only, weeks with valid projection data."
    >
      {/* Explainer */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6 text-sm text-gray-400">
        <span className="text-gray-200 font-medium">How it works: </span>
        Each week Yahoo projects a score for every team before the games are played.
        We compare that to what actually happened. A positive avg means you consistently beat your projection — your roster outperforms expectations.
        A negative avg means Yahoo thought you'd score more than you did.
      </div>

      {/* Year filter */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-gray-400 text-sm">Season:</label>
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

      {data && data.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
          No projection data available yet. Run a data sync to populate projections.
        </div>
      )}

      {data && data.length > 0 && (
        <>
          {/* Bar chart — avg diff */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Avg Weekly Score vs Projection
            </h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="name"
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickFormatter={v => (v > 0 ? `+${v}` : `${v}`)}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#f3f4f6' }}
                  formatter={(v: number) => [`${v > 0 ? '+' : ''}${v.toFixed(2)} pts`, 'Avg vs Projection']}
                />
                <ReferenceLine y={0} stroke="#4b5563" strokeWidth={1.5} />
                <Bar dataKey="diff" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.diff >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  {th('Manager', 'manager_name', 'left')}
                  {th('Weeks', 'weeks')}
                  {th('Avg Actual', 'avg_actual')}
                  {th('Avg Projected', 'avg_projected')}
                  {th('Avg Diff', 'avg_diff')}
                  {th('Beat Proj%', 'beat_projection_pct')}
                  {th('Diff Std Dev', 'std_dev_diff')}
                  {th('Total Over', 'total_over')}
                </tr>
              </thead>
              <tbody>
                {sorted.map(d => (
                  <tr key={d.manager_id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{d.manager_name}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{d.weeks}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{d.avg_actual.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{d.avg_projected.toFixed(1)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${d.avg_diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {d.avg_diff >= 0 ? '+' : ''}{d.avg_diff.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-400">{d.beat_projection_pct.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-amber-400">{d.std_dev_diff.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right ${d.total_over >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {d.total_over >= 0 ? '+' : ''}{d.total_over.toFixed(1)}
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
