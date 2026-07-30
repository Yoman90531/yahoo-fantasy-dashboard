import { useEffect, useState } from 'react'
import LoadingSpinner from '../cards/LoadingSpinner'
import ErrorMessage from '../cards/ErrorMessage'
import YearRangeFilter from '../cards/YearRangeFilter'
import CareerTierRadarChart from '../charts/CareerTierRadarChart'
import { useApi } from '../../hooks/useApi'
import { useSortedTable } from '../../hooks/useSortedTable'
import { statsApi } from '../../api/client'
import type { ManagerTierRow, SeasonSummary } from '../../types'

type SortKey = 'manager_name' | 'composite_score' | 'win_pct' | 'avg_ppg' | 'expected_win_pct' | 'championships' | 'playoff_rate' | 'consistency_score' | 'seasons_played'

const TIER_CONFIG: Record<string, { bg: string; border: string; header: string; badge: string }> = {
  Elite: {
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-700/50',
    header: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-600/40',
  },
  Contender: {
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
  Rebuilding: {
    bg: 'bg-red-900/20',
    border: 'border-red-700/50',
    header: 'text-red-400',
    badge: 'bg-red-500/20 text-red-300 border-red-600/40',
  },
}

const TIER_ORDER = ['Elite', 'Contender', 'Middle of the Pack', 'Rebuilding']

interface Props {
  seasons: SeasonSummary[] | null
}

export default function ManagerTiersPanel({ seasons }: Props) {
  const [yearStart, setYearStart] = useState<number | undefined>(undefined)
  const [yearEnd, setYearEnd] = useState<number | undefined>(undefined)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const { data, loading, error } = useApi<ManagerTierRow[]>(
    ['manager-tiers', yearStart, yearEnd],
    () => statsApi.managerTiers(yearStart, yearEnd),
  )
  const { sorted, th } = useSortedTable<ManagerTierRow, SortKey>(data, 'composite_score')

  useEffect(() => {
    setSelected(new Set((data ?? []).slice(0, 3).map(manager => manager.manager_id)))
  }, [data])

  const tierGroups = TIER_ORDER.map(tier => ({
    tier,
    managers: (data ?? []).filter(manager => manager.tier === tier),
  })).filter(group => group.managers.length > 0)
  const comparedManagers = (data ?? []).filter(manager => selected.has(manager.manager_id))

  function toggleManager(managerId: number) {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(managerId)) {
        next.delete(managerId)
      } else if (next.size < 6) {
        next.add(managerId)
      }
      return next
    })
  }

  return (
    <>
      <YearRangeFilter
        seasons={seasons}
        yearStart={yearStart}
        yearEnd={yearEnd}
        onChange={(start, end) => {
          setYearStart(start)
          setYearEnd(end)
        }}
      />

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && data.length > 0 && (
        <>
          <details className="bg-gray-900 border border-gray-800 rounded-lg p-4 md:p-5 mb-6">
            <summary className="cursor-pointer text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Tier Formula
              <span className="ml-2 text-[11px] normal-case font-normal text-gray-500">Weights and score bands</span>
            </summary>
            <div className="mt-4">
            <p className="text-xs text-gray-400 mb-4">
              Tied results receive equal percentile scores. Career tiers use fixed score bands, and a minimum of three
              seasons is required unless the selected range is shorter.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Win %', weight: '25%', color: 'text-blue-400', desc: 'Career regular-season win percentage across the selected seasons.' },
                { label: 'Avg PPG', weight: '20%', color: 'text-emerald-400', desc: 'Average points scored per game across all seasons played.' },
                { label: 'Expected Wins', weight: '20%', color: 'text-purple-400', desc: 'How often each weekly score would have beaten the rest of the league.' },
                { label: 'Championships', weight: '20%', color: 'text-yellow-400', desc: 'Total league championships won.' },
                { label: 'Playoff Rate', weight: '15%', color: 'text-rose-400', desc: 'Percentage of seasons that ended in a playoff appearance.' },
              ].map(dimension => (
                <div key={dimension.label} className="bg-gray-800 rounded-lg p-3">
                  <div className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${dimension.color}`}>{dimension.label}</div>
                  <div className="text-[10px] text-gray-500 font-mono mb-1.5">Weight: {dimension.weight}</div>
                  <p className="text-xs text-gray-400 leading-relaxed">{dimension.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
              <span>Elite: 75+</span>
              <span>Contender: 55-74.9</span>
              <span>Middle of the Pack: 35-54.9</span>
              <span>Rebuilding: below 35</span>
            </div>
            </div>
          </details>

          <div className="space-y-6 mb-8">
            {tierGroups.map(({ tier, managers }) => {
              const config = TIER_CONFIG[tier]
              return (
                <section key={tier} className={`rounded-xl border ${config.border} ${config.bg} p-5`}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className={`text-lg font-bold ${config.header}`}>{tier}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${config.badge}`}>
                      {managers.length} manager{managers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {managers.map(manager => (
                      <div key={manager.manager_id} className="bg-gray-900/80 border border-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-white text-sm">{manager.manager_name}</span>
                          <span className="text-brand-400 font-bold text-lg">{manager.composite_score.toFixed(1)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          <div className="text-gray-500">Win %</div>
                          <div className="text-right text-gray-300">{(manager.win_pct * 100).toFixed(1)}%</div>
                          <div className="text-gray-500">Avg PPG</div>
                          <div className="text-right text-gray-300">{manager.avg_ppg.toFixed(1)}</div>
                          <div className="text-gray-500">Expected Win %</div>
                          <div className="text-right text-gray-300">{(manager.expected_win_pct * 100).toFixed(1)}%</div>
                          <div className="text-gray-500">Championships</div>
                          <div className="text-right text-gray-300">{manager.championships}</div>
                          <div className="text-gray-500">Playoff Rate</div>
                          <div className="text-right text-gray-300">{(manager.playoff_rate * 100).toFixed(0)}%</div>
                          <div className="text-gray-500">Seasons</div>
                          <div className="text-right text-gray-300">{manager.seasons_played}</div>
                          <div className="text-gray-500">Finish Stability</div>
                          <div className="text-right text-gray-300">{manager.consistency_score.toFixed(0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>

          <section className="bg-gray-900 border border-gray-800 rounded-lg p-4 md:p-5 mb-6" aria-labelledby="career-comparison-heading">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 id="career-comparison-heading" className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Career Profile Comparison
              </h2>
              <span className="text-xs text-gray-500">{selected.size}/6</span>
            </div>
            <fieldset className="flex flex-wrap gap-2 mb-2">
              <legend className="sr-only">Managers included in the career profile comparison</legend>
              {(data ?? []).map(manager => {
                const checked = selected.has(manager.manager_id)
                return (
                  <label
                    key={manager.manager_id}
                    className={`flex items-center gap-2 border rounded-lg px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-gray-800 border-brand-500 text-white'
                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && selected.size >= 6}
                      onChange={() => toggleManager(manager.manager_id)}
                      className="accent-blue-500"
                    />
                    {manager.manager_name}
                  </label>
                )
              })}
            </fieldset>
            {comparedManagers.length > 0 && <CareerTierRadarChart managers={comparedManagers} />}
          </section>

          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-8">#</th>
                  {th('Manager', 'manager_name', 'left')}
                  <th className="px-4 py-3 text-left">Tier</th>
                  {th('Score', 'composite_score')}
                  {th('Win %', 'win_pct')}
                  {th('Avg PPG', 'avg_ppg')}
                  {th('Expected Win %', 'expected_win_pct')}
                  {th('Champs', 'championships')}
                  {th('Playoff %', 'playoff_rate')}
                  {th('Finish Stability', 'consistency_score')}
                  {th('Seasons', 'seasons_played')}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, index) => {
                  const config = TIER_CONFIG[row.tier]
                  return (
                    <tr key={row.manager_id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-white">{row.manager_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${config.badge}`}>{row.tier}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-brand-400">{row.composite_score.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{(row.win_pct * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right text-gray-300">{row.avg_ppg.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{(row.expected_win_pct * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right text-gray-300">{row.championships}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{(row.playoff_rate * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right text-gray-300">{row.consistency_score.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{row.seasons_played}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
