import { useState } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label, Cell } from 'recharts'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi, seasonsApi } from '../api/client'
import type { StrengthOfScheduleRow, SeasonSummary } from '../types'

type SortKey = 'manager_name' | 'actual_win_pct' | 'avg_opp_win_pct' | 'avg_opp_pf' | 'sos_rank' | 'adjusted_win_pct' | 'wins_above_expected'

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
  '#6366f1', '#e11d48', '#22c55e', '#eab308',
]

export default function StrengthOfSchedule() {
  const [year, setYear] = useState<number | undefined>(undefined)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'adjusted_win_pct', dir: -1 })
  const { data: seasons } = useApi<SeasonSummary[]>(() => seasonsApi.list(), [])
  const { data, loading, error } = useApi<StrengthOfScheduleRow[]>(() => statsApi.strengthOfSchedule(year), [year])

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

  // Scatter plot data
  const scatterData = (data ?? []).map((r, i) => ({
    x: r.avg_opp_win_pct * 100,
    y: r.actual_win_pct * 100,
    name: r.manager_name.split(' ')[0],
    fullName: r.manager_name,
    colorIdx: i,
  }))

  // Averages for reference lines
  const avgOppWp = data && data.length > 0 ? (data.reduce((s, r) => s + r.avg_opp_win_pct, 0) / data.length) * 100 : 50
  const avgWinPct = data && data.length > 0 ? (data.reduce((s, r) => s + r.actual_win_pct, 0) / data.length) * 100 : 50

  return (
    <PageWrapper
      title="Strength of Schedule"
      subtitle="Who had the toughest opponents? SOS-adjusted win% accounts for schedule difficulty."
    >
      {/* Formula explainer */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6 text-sm text-gray-400">
        <span className="text-gray-200 font-medium">How it works: </span>
        For each manager, we calculate the average win percentage and scoring of every opponent they faced in the regular season. The SOS-adjusted win% adds a bonus for facing tough opponents and a penalty for facing weak ones. Wins Above Expected shows how many extra wins a manager earned relative to their schedule difficulty.
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
          {/* Scatter Plot */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h3 className="text-white font-medium mb-4">Schedule Difficulty vs Actual Win%</h3>
            <p className="text-gray-500 text-xs mb-4">
              Top-right = won despite hard schedule. Bottom-left = lost with easy schedule. Dashed lines show league averages.
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Avg Opp Win%"
                  unit="%"
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                >
                  <Label value="Avg Opponent Win%" position="bottom" offset={0} fill="#9ca3af" fontSize={12} />
                </XAxis>
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Actual Win%"
                  unit="%"
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                >
                  <Label value="Actual Win%" angle={-90} position="insideLeft" offset={10} fill="#9ca3af" fontSize={12} />
                </YAxis>
                <ReferenceLine x={avgOppWp} stroke="#4b5563" strokeDasharray="5 5" />
                <ReferenceLine y={avgWinPct} stroke="#4b5563" strokeDasharray="5 5" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                  labelFormatter={(_: unknown, payload: Array<{ payload?: { fullName?: string } }>) =>
                    payload?.[0]?.payload?.fullName ?? ''
                  }
                />
                <Scatter data={scatterData} fill="#3b82f6">
                  {scatterData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {scatterData.map((entry, i) => (
                <div key={entry.fullName} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {entry.name}
                </div>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  {th('Manager', 'manager_name', 'left')}
                  {th('Win%', 'actual_win_pct')}
                  {th('Opp Win%', 'avg_opp_win_pct')}
                  {th('Opp PPG', 'avg_opp_pf')}
                  {th('SOS Rank', 'sos_rank')}
                  {th('Adj Win%', 'adjusted_win_pct')}
                  {th('Wins Above Exp', 'wins_above_expected')}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.manager_id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.manager_name}</td>
                    <td className="px-4 py-3 text-right">{(r.actual_win_pct * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-gray-400">{(r.avg_opp_win_pct * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-gray-400">{r.avg_opp_pf.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        r.sos_rank <= 3 ? 'bg-red-900/40 text-red-400' : r.sos_rank <= 6 ? 'bg-yellow-900/40 text-yellow-400' : 'bg-green-900/40 text-green-400'
                      }`}>
                        {r.sos_rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-400">{(r.adjusted_win_pct * 100).toFixed(1)}%</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.wins_above_expected > 0 ? 'text-green-400' : r.wins_above_expected < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {r.wins_above_expected > 0 ? '+' : ''}{r.wins_above_expected.toFixed(1)}
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
