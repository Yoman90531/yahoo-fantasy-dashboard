import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi, seasonsApi } from '../api/client'
import type { WinMarginRow, SeasonSummary } from '../types'

type SortKey = 'manager_name' | 'avg_win_margin' | 'avg_loss_margin' | 'blowout_wins' | 'close_wins' | 'blowout_losses' | 'close_losses' | 'biggest_win' | 'biggest_loss'

export default function WinMargins() {
  const [year, setYear] = useState<number | undefined>(undefined)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'avg_win_margin', dir: -1 })
  const { data: seasons } = useApi<SeasonSummary[]>(() => seasonsApi.list(), [])
  const { data, loading, error } = useApi<WinMarginRow[]>(() => statsApi.winMargins(year), [year])

  const toggle = (key: SortKey) =>
    setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'manager_name' ? 1 : -1 })

  const sorted = [...(data ?? [])].sort((a, b) => {
    if (sort.key === 'manager_name') return a.manager_name.localeCompare(b.manager_name) * sort.dir
    return ((a[sort.key] as number) - (b[sort.key] as number)) * sort.dir
  })

  const chartData = (data ?? []).map(r => ({
    name: r.manager_name.split(' ')[0],
    'Avg Win Margin': r.avg_win_margin,
    'Avg Loss Margin': r.avg_loss_margin,
  }))

  const th = (label: string, key: SortKey, align: 'left' | 'right' = 'right') => (
    <th className={`px-4 py-3 text-${align} cursor-pointer hover:text-white select-none`} onClick={() => toggle(key)}>
      {label} {sort.key === key ? (sort.dir === -1 ? '↓' : '↑') : ''}
    </th>
  )

  return (
    <PageWrapper
      title="Win Margin Analytics"
      subtitle="How dominant are wins? How painful are losses? Analyze the margin of victory and defeat for each manager."
      dataScope="regular"
    >
      {/* Explainer */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6 text-sm text-gray-400">
        <span className="text-gray-200 font-medium">How it works: </span>
        For every regular-season matchup, we calculate the point margin. Blowouts are margins greater than 30 points; close games are margins under 5 points. Only decided games (no ties) are counted.
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
          {/* Grouped bar chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
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
                  formatter={(v: number) => v.toFixed(2)}
                />
                <Legend wrapperStyle={{ color: '#9ca3af' }} />
                <Bar dataKey="Avg Win Margin" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Avg Loss Margin" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  {th('Manager', 'manager_name', 'left')}
                  {th('Avg Win', 'avg_win_margin')}
                  {th('Avg Loss', 'avg_loss_margin')}
                  {th('Blowout W', 'blowout_wins')}
                  {th('Close W', 'close_wins')}
                  {th('Blowout L', 'blowout_losses')}
                  {th('Close L', 'close_losses')}
                  {th('Biggest W', 'biggest_win')}
                  {th('Biggest L', 'biggest_loss')}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.manager_id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.manager_name}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-bold">{r.avg_win_margin.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-red-400 font-bold">{r.avg_loss_margin.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{r.blowout_wins}</td>
                    <td className="px-4 py-3 text-right">{r.close_wins}</td>
                    <td className="px-4 py-3 text-right">{r.blowout_losses}</td>
                    <td className="px-4 py-3 text-right">{r.close_losses}</td>
                    <td className="px-4 py-3 text-right text-green-400">{r.biggest_win.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-red-400">{r.biggest_loss.toFixed(2)}</td>
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
