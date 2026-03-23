import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi } from '../api/client'
import type { StreakRow } from '../types'

type SortKey = 'manager_name' | 'current_streak_length' | 'longest_win_streak' | 'longest_loss_streak'

function formatStreak(type: string, length: number): string {
  if (length === 0) return '-'
  return `${type}${length}`
}

function formatWhen(startYear: number | null, startWeek: number | null, endYear: number | null, endWeek: number | null): string {
  if (startYear === null || endYear === null) return '-'
  if (startYear === endYear) return `${startYear} Wk ${startWeek}-${endWeek}`
  return `${startYear} Wk ${startWeek} - ${endYear} Wk ${endWeek}`
}

export default function StreakTracker() {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'current_streak_length', dir: -1 })
  const { data, loading, error } = useApi<StreakRow[]>(() => statsApi.streaks(), [])

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

  // Summary card helpers
  const activeWinStreaks = (data ?? []).filter(r => r.current_streak_type === 'W' && r.current_streak_length > 0)
  const activeLossStreaks = (data ?? []).filter(r => r.current_streak_type === 'L' && r.current_streak_length > 0)
  const longestActiveWin = activeWinStreaks.length > 0
    ? activeWinStreaks.reduce((a, b) => a.current_streak_length >= b.current_streak_length ? a : b)
    : null
  const longestActiveLoss = activeLossStreaks.length > 0
    ? activeLossStreaks.reduce((a, b) => a.current_streak_length >= b.current_streak_length ? a : b)
    : null
  const allTimeLongestWin = (data ?? []).length > 0
    ? (data ?? []).reduce((a, b) => a.longest_win_streak >= b.longest_win_streak ? a : b)
    : null

  return (
    <PageWrapper
      title="Streak Tracker"
      subtitle="Winning and losing streaks across all managers."
      dataScope="regular"
    >
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Longest Active Win Streak</div>
              {longestActiveWin ? (
                <>
                  <div className="text-2xl font-bold text-green-400">W{longestActiveWin.current_streak_length}</div>
                  <div className="text-sm text-gray-400 mt-1">{longestActiveWin.manager_name}</div>
                </>
              ) : (
                <div className="text-2xl font-bold text-gray-600">-</div>
              )}
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Longest Active Loss Streak</div>
              {longestActiveLoss ? (
                <>
                  <div className="text-2xl font-bold text-red-400">L{longestActiveLoss.current_streak_length}</div>
                  <div className="text-sm text-gray-400 mt-1">{longestActiveLoss.manager_name}</div>
                </>
              ) : (
                <div className="text-2xl font-bold text-gray-600">-</div>
              )}
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">All-Time Longest Win Streak</div>
              {allTimeLongestWin ? (
                <>
                  <div className="text-2xl font-bold text-blue-400">W{allTimeLongestWin.longest_win_streak}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {allTimeLongestWin.manager_name} &mdash; {formatWhen(
                      allTimeLongestWin.longest_win_start_year,
                      allTimeLongestWin.longest_win_start_week,
                      allTimeLongestWin.longest_win_end_year,
                      allTimeLongestWin.longest_win_end_week
                    )}
                  </div>
                </>
              ) : (
                <div className="text-2xl font-bold text-gray-600">-</div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  {th('Manager', 'manager_name', 'left')}
                  {th('Current Streak', 'current_streak_length')}
                  {th('Longest Win Streak', 'longest_win_streak')}
                  <th className="px-4 py-3 text-right">When</th>
                  {th('Longest Loss Streak', 'longest_loss_streak')}
                  <th className="px-4 py-3 text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.manager_id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.manager_name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${r.current_streak_type === 'W' ? 'text-green-400' : r.current_streak_type === 'L' ? 'text-red-400' : 'text-gray-400'}`}>
                        {formatStreak(r.current_streak_type, r.current_streak_length)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-400">
                      {r.longest_win_streak > 0 ? `W${r.longest_win_streak}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {formatWhen(r.longest_win_start_year, r.longest_win_start_week, r.longest_win_end_year, r.longest_win_end_week)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-400">
                      {r.longest_loss_streak > 0 ? `L${r.longest_loss_streak}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {formatWhen(r.longest_loss_start_year, r.longest_loss_start_week, r.longest_loss_end_year, r.longest_loss_end_week)}
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
