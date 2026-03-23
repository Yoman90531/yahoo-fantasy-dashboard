import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import PowerRadarChart from '../components/charts/PowerRadarChart'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import YearFilter from '../components/cards/YearFilter'
import { useApi } from '../hooks/useApi'
import { statsApi, seasonsApi } from '../api/client'
import type { PowerRankingRow, SeasonSummary } from '../types'

type PRSortKey = 'manager_name' | 'overall_score' | 'win_rate' | 'scoring' | 'consistency' | 'luck_adjusted' | 'playoff_success'

export default function PowerRankings() {
  const [year, setYear] = useState<number | undefined>(undefined)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sort, setSort] = useState<{ key: PRSortKey; dir: 1 | -1 }>({ key: 'overall_score', dir: -1 })
  const { data: seasons } = useApi<SeasonSummary[]>(() => seasonsApi.list(), [])
  const { data, loading, error } = useApi<PowerRankingRow[]>(() => statsApi.powerRankings(year), [year])

  const toggleSort = (key: PRSortKey) =>
    setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'manager_name' ? 1 : -1 })

  const sorted = [...(data ?? [])].sort((a, b) => {
    if (sort.key === 'manager_name') return a.manager_name.localeCompare(b.manager_name) * sort.dir
    if (sort.key === 'overall_score') return (a.overall_score - b.overall_score) * sort.dir
    return (a.dimensions[sort.key] - b.dimensions[sort.key]) * sort.dir
  })

  const th = (label: string, key: PRSortKey) => (
    <th className="px-4 py-3 text-right cursor-pointer hover:text-white select-none" onClick={() => toggleSort(key)}>
      {label} {sort.key === key ? (sort.dir === -1 ? '↓' : '↑') : ''}
    </th>
  )

  // Auto-select top 3 (by overall_score desc) for radar when none selected
  const radarManagers = (data ?? []).filter((r, i) =>
    selected.size > 0 ? selected.has(r.manager_id) : i < 3
  )

  function toggleManager(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 6) {
        next.add(id)
      }
      return next
    })
  }

  return (
    <PageWrapper
      title="Power Rankings"
      subtitle="Composite dominance score across 5 dimensions. Click rows to compare on the radar chart."
      dataScope="regular"
    >
      <YearFilter seasons={seasons} year={year} onChange={y => { setYear(y); setSelected(new Set()) }} />

      {/* Methodology */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">How It Works</h2>
        <p className="text-xs text-gray-400 mb-4">
          Each dimension is independently computed, then percentile-ranked 0–100 against all managers in the selected scope.
          A score of 100 means best in the league; 0 means worst. <strong className="text-gray-300">Overall</strong> is the simple average of all five.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            {
              label: 'Win Rate',
              color: 'text-blue-400',
              formula: 'Wins ÷ Games Played',
              desc: 'The most direct measure of success — did you win your matchup? A manager who goes 10-3 in a season scores 77% here. Reflects how well you convert good rosters into actual wins.',
            },
            {
              label: 'Scoring',
              color: 'text-emerald-400',
              formula: 'Avg Points Per Week',
              desc: 'Raw weekly scoring power averaged across all regular-season games. Regardless of opponent or luck, this asks: how many points did you actually put up? High scorers are dangerous every week.',
            },
            {
              label: 'Consistency',
              color: 'text-amber-400',
              formula: '1 ÷ Score Std Deviation',
              desc: 'How predictable is your output week to week? A low standard deviation = high consistency. Boom-or-bust managers score high one week and tank the next. Steady managers show up reliably and avoid catastrophic losses.',
            },
            {
              label: 'Skill',
              color: 'text-purple-400',
              formula: 'Expected Wins Per Game',
              desc: 'Each week, your score is ranked against all other teams\' scores. Your "expected wins" = fraction of opponents you would have beaten. A manager with high skill consistently puts up scores that would beat most opponents — regardless of who they actually faced.',
            },
            {
              label: 'Playoffs',
              color: 'text-rose-400',
              formula: 'Postseason Success Score',
              desc: 'Rewards peaking when it matters most. Championship = 100 pts, runner-up = 70, made playoffs = 40, missed playoffs = 0 — averaged per season played. A manager who always makes the playoffs but never wins scores lower than one who wins titles.',
            },
          ].map(d => (
            <div key={d.label} className="bg-gray-800 rounded-lg p-3">
              <div className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${d.color}`}>{d.label}</div>
              <div className="text-[10px] text-gray-500 font-mono mb-1.5">{d.formula}</div>
              <p className="text-xs text-gray-400 leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && data.length > 0 && (
        <>
          {/* Radar chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <PowerRadarChart managers={radarManagers} />
          </div>

          {/* Leaderboard table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:text-white select-none" onClick={() => toggleSort('manager_name')}>
                    Manager {sort.key === 'manager_name' ? (sort.dir === -1 ? '↓' : '↑') : ''}
                  </th>
                  {th('Overall', 'overall_score')}
                  {th('Win Rate', 'win_rate')}
                  {th('Scoring', 'scoring')}
                  {th('Consistency', 'consistency')}
                  {th('Skill', 'luck_adjusted')}
                  {th('Playoffs', 'playoff_success')}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const isSelected = selected.size > 0 ? selected.has(r.manager_id) : i < 3
                  return (
                    <tr
                      key={r.manager_id}
                      onClick={() => toggleManager(r.manager_id)}
                      className={`border-t border-gray-800 cursor-pointer transition-colors ${
                        isSelected ? 'bg-gray-800' : 'hover:bg-gray-800/50'
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-white">{r.manager_name}</td>
                      <td className="px-4 py-3 text-right font-bold text-brand-400">{r.overall_score.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{r.dimensions.win_rate.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{r.dimensions.scoring.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{r.dimensions.consistency.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{r.dimensions.luck_adjusted.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{r.dimensions.playoff_success.toFixed(0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </>
      )}
    </PageWrapper>
  )
}
