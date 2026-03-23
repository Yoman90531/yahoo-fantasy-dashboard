import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import WinRateBarChart from '../components/charts/WinRateBarChart'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi, seasonsApi } from '../api/client'
import type { ConsolationRow, SeasonSummary } from '../types'

type SortKey = 'manager_name' | 'times_missed_playoffs' | 'consolation_games' | 'consolation_wins' | 'consolation_losses' | 'consolation_win_pct' | 'consolation_avg_points'

export default function ConsolationBracket() {
  const [year, setYear] = useState<number | undefined>(undefined)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'consolation_wins', dir: -1 })
  const { data: seasons } = useApi<SeasonSummary[]>(() => seasonsApi.list(), [])
  const { data, loading, error } = useApi<ConsolationRow[]>(() => statsApi.consolation(year), [year])

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

  // Summary cards
  const consolationKing = data && data.length > 0
    ? [...data].sort((a, b) => b.consolation_wins - a.consolation_wins)[0]
    : null

  const mostAppearances = data && data.length > 0
    ? [...data].sort((a, b) => b.times_missed_playoffs - a.times_missed_playoffs)[0]
    : null

  // Bar chart: consolation win% for managers with games
  const barData = (data ?? [])
    .filter(r => r.consolation_games > 0)
    .sort((a, b) => b.consolation_win_pct - a.consolation_win_pct)
    .map(r => ({
      name: r.manager_name.split(' ')[0],
      value: Math.round(r.consolation_win_pct * 100),
    }))

  return (
    <PageWrapper
      title="Consolation Bracket"
      subtitle="Who dominates the loser bracket? Stats from consolation round matchups."
      dataScope="playoffs"
    >
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
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {consolationKing && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Consolation King</div>
                <div className="text-xl font-bold text-white">{consolationKing.manager_name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {consolationKing.consolation_wins} consolation wins ({(consolationKing.consolation_win_pct * 100).toFixed(0)}% win rate)
                </div>
              </div>
            )}
            {mostAppearances && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Most Consolation Appearances</div>
                <div className="text-xl font-bold text-white">{mostAppearances.manager_name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  Missed playoffs {mostAppearances.times_missed_playoffs} time{mostAppearances.times_missed_playoffs !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>

          {/* Bar chart */}
          {barData.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <WinRateBarChart data={barData} label="Win %" formatValue={v => `${v}%`} />
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  {th('Manager', 'manager_name', 'left')}
                  {th('Missed Playoffs', 'times_missed_playoffs')}
                  {th('Games', 'consolation_games')}
                  {th('Wins', 'consolation_wins')}
                  {th('Losses', 'consolation_losses')}
                  {th('Win %', 'consolation_win_pct')}
                  {th('Avg Pts', 'consolation_avg_points')}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.manager_id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.manager_name}</td>
                    <td className="px-4 py-3 text-right">{r.times_missed_playoffs}</td>
                    <td className="px-4 py-3 text-right">{r.consolation_games}</td>
                    <td className="px-4 py-3 text-right text-green-400">{r.consolation_wins}</td>
                    <td className="px-4 py-3 text-right text-red-400">{r.consolation_losses}</td>
                    <td className="px-4 py-3 text-right font-bold">
                      {r.consolation_games > 0 ? `${(r.consolation_win_pct * 100).toFixed(0)}%` : '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {r.consolation_games > 0 ? r.consolation_avg_points.toFixed(1) : '\u2014'}
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
