import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import PowerRadarChart from '../components/charts/PowerRadarChart'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi, seasonsApi } from '../api/client'
import type { PowerRankingRow, SeasonSummary } from '../types'

export default function PowerRankings() {
  const [year, setYear] = useState<number | undefined>(undefined)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const { data: seasons } = useApi<SeasonSummary[]>(() => seasonsApi.list(), [])
  const { data, loading, error } = useApi<PowerRankingRow[]>(() => statsApi.powerRankings(year), [year])

  // Auto-select top 3 when data loads
  const radarManagers = data
    ? data.filter((_, i) => selected.size > 0 ? selected.has(data[i].manager_id) : i < 3)
    : []

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
    >
      {/* Year filter */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-gray-400 text-sm">Season:</label>
        <select
          value={year ?? ''}
          onChange={e => {
            setYear(e.target.value ? Number(e.target.value) : undefined)
            setSelected(new Set())
          }}
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        >
          <option value="">All time</option>
          {[...(seasons ?? [])].reverse().map(s => (
            <option key={s.year} value={s.year}>{s.year}</option>
          ))}
        </select>
      </div>

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
              desc: 'Regular-season wins divided by total games played. The most direct measure of whether you win your matchup.',
            },
            {
              label: 'Scoring',
              color: 'text-emerald-400',
              desc: 'Average points scored per game. Rewards managers who consistently put up big numbers regardless of opponent.',
            },
            {
              label: 'Consistency',
              color: 'text-amber-400',
              desc: 'Inverse of weekly score standard deviation. A high score here means you show up every week — no boom-or-bust.',
            },
            {
              label: 'Skill',
              color: 'text-purple-400',
              desc: 'Expected wins per game based on how your score ranks against every other team\'s score that week. High skill means you would have beaten most opponents most weeks — luck-adjusted.',
            },
            {
              label: 'Playoffs',
              color: 'text-rose-400',
              desc: 'Average postseason success per season: champion = 100 pts, runner-up = 70, made playoffs = 40, missed = 0. Rewards managers who peak when it matters.',
            },
          ].map(d => (
            <div key={d.label} className="bg-gray-800 rounded-lg p-3">
              <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${d.color}`}>{d.label}</div>
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
                  <th className="px-4 py-3 text-left">Manager</th>
                  <th className="px-4 py-3 text-right">Overall</th>
                  <th className="px-4 py-3 text-right">Win Rate</th>
                  <th className="px-4 py-3 text-right">Scoring</th>
                  <th className="px-4 py-3 text-right">Consistency</th>
                  <th className="px-4 py-3 text-right">Skill</th>
                  <th className="px-4 py-3 text-right">Playoffs</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => {
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
