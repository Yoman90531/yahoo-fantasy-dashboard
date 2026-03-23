import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi } from '../api/client'
import type { ManagerTierRow } from '../types'

type SortKey = 'manager_name' | 'composite_score' | 'win_pct' | 'avg_ppg' | 'championships' | 'playoff_rate' | 'consistency_score' | 'seasons_played'

const TIER_CONFIG: Record<string, { bg: string; border: string; header: string; badge: string }> = {
  'Elite': {
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-700/50',
    header: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-600/40',
  },
  'Contender': {
    bg: 'bg-blue-900/20',
    border: 'border-blue-700/50',
    header: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-600/40',
  },
  'Middle of the Pack': {
    bg: 'bg-gray-800/50',
    border: 'border-gray-700/50',
    header: 'text-gray-400',
    badge: 'bg-gray-600/20 text-gray-300 border-gray-600/40',
  },
  'Rebuilding': {
    bg: 'bg-red-900/20',
    border: 'border-red-700/50',
    header: 'text-red-400',
    badge: 'bg-red-500/20 text-red-300 border-red-600/40',
  },
}

const TIER_ORDER = ['Elite', 'Contender', 'Middle of the Pack', 'Rebuilding']

export default function ManagerTiers() {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'composite_score', dir: -1 })
  const { data, loading, error } = useApi<ManagerTierRow[]>(() => statsApi.managerTiers(), [])

  const toggleSort = (key: SortKey) =>
    setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'manager_name' ? 1 : -1 })

  const sorted = [...(data ?? [])].sort((a, b) => {
    if (sort.key === 'manager_name') return a.manager_name.localeCompare(b.manager_name) * sort.dir
    return ((a[sort.key] as number) - (b[sort.key] as number)) * sort.dir
  })

  const tierGroups = TIER_ORDER.map(tier => ({
    tier,
    managers: (data ?? []).filter(m => m.tier === tier),
  })).filter(g => g.managers.length > 0)

  const th = (label: string, key: SortKey) => (
    <th className="px-4 py-3 text-right cursor-pointer hover:text-white select-none" onClick={() => toggleSort(key)}>
      {label} {sort.key === key ? (sort.dir === -1 ? '\u2193' : '\u2191') : ''}
    </th>
  )

  return (
    <PageWrapper
      title="Manager Tiers"
      subtitle="Career performance tiers based on composite scoring across win%, PPG, championships, playoff rate, and consistency. Minimum 3 seasons required."
    >
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && data.length > 0 && (
        <>
          {/* Methodology */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">How Tiers Are Calculated</h2>
            <p className="text-xs text-gray-400 mb-4">
              Each stat is percentile-ranked 0-100 across all qualifying managers, then combined into a weighted composite score.
              Managers are placed into tiers based on their composite ranking.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Win %', weight: '25%', color: 'text-blue-400', desc: 'Career win percentage across all regular season and playoff games.' },
                { label: 'Avg PPG', weight: '25%', color: 'text-emerald-400', desc: 'Average points scored per game across all seasons played.' },
                { label: 'Championships', weight: '20%', color: 'text-yellow-400', desc: 'Total league championships won. Rewards the ultimate achievement.' },
                { label: 'Playoff Rate', weight: '15%', color: 'text-purple-400', desc: 'Percentage of seasons where the manager made the playoffs.' },
                { label: 'Consistency', weight: '15%', color: 'text-rose-400', desc: 'Stability of season finishes. Low variance in final standings rank.' },
              ].map(d => (
                <div key={d.label} className="bg-gray-800 rounded-lg p-3">
                  <div className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${d.color}`}>{d.label}</div>
                  <div className="text-[10px] text-gray-500 font-mono mb-1.5">Weight: {d.weight}</div>
                  <p className="text-xs text-gray-400 leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tier cards */}
          <div className="space-y-6 mb-8">
            {tierGroups.map(({ tier, managers }) => {
              const cfg = TIER_CONFIG[tier]
              return (
                <div key={tier} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5`}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className={`text-lg font-bold ${cfg.header}`}>{tier}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                      {managers.length} manager{managers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {managers.map(m => (
                      <div key={m.manager_id} className="bg-gray-900/80 border border-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-white text-sm">{m.manager_name}</span>
                          <span className="text-brand-400 font-bold text-lg">{m.composite_score.toFixed(1)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <div className="text-gray-500">Win %</div>
                          <div className="text-right text-gray-300">{(m.win_pct * 100).toFixed(1)}%</div>
                          <div className="text-gray-500">Avg PPG</div>
                          <div className="text-right text-gray-300">{m.avg_ppg.toFixed(1)}</div>
                          <div className="text-gray-500">Championships</div>
                          <div className="text-right text-gray-300">{m.championships}</div>
                          <div className="text-gray-500">Playoff Rate</div>
                          <div className="text-right text-gray-300">{(m.playoff_rate * 100).toFixed(0)}%</div>
                          <div className="text-gray-500">Seasons</div>
                          <div className="text-right text-gray-300">{m.seasons_played}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Detailed sortable table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:text-white select-none" onClick={() => toggleSort('manager_name')}>
                    Manager {sort.key === 'manager_name' ? (sort.dir === -1 ? '\u2193' : '\u2191') : ''}
                  </th>
                  <th className="px-4 py-3 text-left">Tier</th>
                  {th('Score', 'composite_score')}
                  {th('Win %', 'win_pct')}
                  {th('Avg PPG', 'avg_ppg')}
                  {th('Champs', 'championships')}
                  {th('Playoff %', 'playoff_rate')}
                  {th('Consistency', 'consistency_score')}
                  {th('Seasons', 'seasons_played')}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const cfg = TIER_CONFIG[r.tier]
                  return (
                    <tr key={r.manager_id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-white">{r.manager_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.badge}`}>{r.tier}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-brand-400">{r.composite_score.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{(r.win_pct * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right text-gray-300">{r.avg_ppg.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{r.championships}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{(r.playoff_rate * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right text-gray-300">{r.consistency_score.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{r.seasons_played}</td>
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
