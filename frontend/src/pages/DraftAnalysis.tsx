import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import YearFilter from '../components/cards/YearFilter'
import ExplainerCard from '../components/cards/ExplainerCard'
import { useApi } from '../hooks/useApi'
import { useSortedTable } from '../hooks/useSortedTable'
import { draftApi, seasonsApi } from '../api/client'
import type { DraftAnalysis as DraftAnalysisType, DraftGradeRow, SeasonSummary } from '../types'

const POS_COLORS: Record<string, string> = {
  QB: '#ef4444',
  RB: '#22c55e',
  WR: '#3b82f6',
  TE: '#f97316',
  K: '#6b7280',
  DEF: '#a855f7',
}

type GradeSortKey = 'manager_name' | 'year' | 'grade' | 'composite_score' | 'total_picks' | 'avg_roi'

export default function DraftAnalysis() {
  const [year, setYear] = useState<number | undefined>(undefined)
  const { data: seasons } = useApi<SeasonSummary[]>(() => seasonsApi.list(), [])
  const { data, loading, error } = useApi<DraftAnalysisType>(() => draftApi.analysis(year), [year])
  const { sorted: sortedGrades, th } = useSortedTable<DraftGradeRow, GradeSortKey>(data?.grades ?? null, 'composite_score')

  // Build stacked bar data for position capital chart
  const capitalChartData = useMemo(() => {
    if (!data?.position_capital.length) return []
    const byManager: Record<string, Record<string, number>> = {}
    for (const row of data.position_capital) {
      if (!byManager[row.manager_name]) byManager[row.manager_name] = {}
      byManager[row.manager_name][row.position] = row.total_capital
    }
    return Object.entries(byManager).map(([name, positions]) => ({
      name: name.split(' ')[0],
      ...positions,
    }))
  }, [data?.position_capital])

  const allPositions = useMemo(() => {
    if (!data?.position_capital) return []
    const s = new Set(data.position_capital.map(r => r.position))
    return ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].filter(p => s.has(p))
  }, [data?.position_capital])

  // Build tendencies heatmap data
  const tendencyManagers = useMemo(() => {
    if (!data?.tendencies.length) return []
    const mgrs = new Set(data.tendencies.map(r => r.manager_name))
    return Array.from(mgrs).sort()
  }, [data?.tendencies])

  return (
    <PageWrapper
      title="Draft Analysis"
      subtitle="Analyze draft capital allocation, position tendencies, and pick ROI across seasons."
      dataScope="regular"
    >
      <ExplainerCard>
        Draft capital is calculated by pick value (total picks - pick number + 1), giving early picks more weight.
        ROI compares each player's season fantasy points against their pick value. Grades are based on average ROI across all picks in a draft.
      </ExplainerCard>

      <YearFilter seasons={seasons} year={year} onChange={setYear} />

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && (
        <>
          {/* Position Capital Stacked Bar */}
          {capitalChartData.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Draft Capital by Position</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={capitalChartData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
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
                    formatter={(v: number) => v.toFixed(1)}
                  />
                  <Legend wrapperStyle={{ color: '#9ca3af' }} />
                  {allPositions.map(pos => (
                    <Bar key={pos} dataKey={pos} stackId="capital" fill={POS_COLORS[pos] || '#6b7280'} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Drafting Tendencies */}
          {tendencyManagers.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Drafting Tendencies</h3>
              <p className="text-gray-400 text-sm mb-4">Percentage of picks at each position by round tier: Early (1-4), Mid (5-9), Late (10+)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-950 text-gray-400 text-xs uppercase tracking-wider">
                      <th className="px-3 py-2 text-left">Manager</th>
                      {allPositions.map(pos => (
                        <th key={pos} className="px-3 py-2 text-center" colSpan={3}>{pos}</th>
                      ))}
                    </tr>
                    <tr className="bg-gray-950 text-gray-500 text-xs">
                      <th className="px-3 py-1"></th>
                      {allPositions.map(pos => (
                        <>{/* eslint-disable-next-line react/jsx-key */}
                          <th key={`${pos}-e`} className="px-2 py-1 text-center font-normal">Early</th>
                          <th key={`${pos}-m`} className="px-2 py-1 text-center font-normal">Mid</th>
                          <th key={`${pos}-l`} className="px-2 py-1 text-center font-normal">Late</th>
                        </>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tendencyManagers.map(mgr => {
                      const mgrData = data.tendencies.filter(t => t.manager_name === mgr)
                      const byPos: Record<string, { early: number; mid: number; late: number }> = {}
                      for (const t of mgrData) {
                        byPos[t.position] = { early: t.early_round_pct, mid: t.mid_round_pct, late: t.late_round_pct }
                      }
                      return (
                        <tr key={mgr} className="border-t border-gray-800 hover:bg-gray-800">
                          <td className="px-3 py-2 font-medium text-white whitespace-nowrap">{mgr}</td>
                          {allPositions.map(pos => {
                            const d = byPos[pos]
                            if (!d) return <><td key={`${pos}-e`} className="px-2 py-2 text-center text-gray-600">-</td><td key={`${pos}-m`} className="px-2 py-2 text-center text-gray-600">-</td><td key={`${pos}-l`} className="px-2 py-2 text-center text-gray-600">-</td></>
                            return (
                              <>
                                <td key={`${pos}-e`} className="px-2 py-2 text-center" style={{ color: d.early > 50 ? '#22c55e' : '#9ca3af' }}>{d.early}%</td>
                                <td key={`${pos}-m`} className="px-2 py-2 text-center" style={{ color: d.mid > 50 ? '#facc15' : '#9ca3af' }}>{d.mid}%</td>
                                <td key={`${pos}-l`} className="px-2 py-2 text-center" style={{ color: d.late > 50 ? '#ef4444' : '#9ca3af' }}>{d.late}%</td>
                              </>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Draft Grades Table */}
          {sortedGrades.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Draft Grades</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-950 text-gray-400 text-xs uppercase tracking-wider">
                      {th('Manager', 'manager_name', 'left')}
                      {th('Year', 'year')}
                      {th('Grade', 'grade')}
                      {th('Avg ROI', 'avg_roi')}
                      {th('Picks', 'total_picks')}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGrades.map((r, i) => {
                      const gradeColor = r.grade.startsWith('A') ? 'text-green-400'
                        : r.grade.startsWith('B') ? 'text-blue-400'
                        : r.grade.startsWith('C') ? 'text-yellow-400'
                        : r.grade.startsWith('D') ? 'text-orange-400'
                        : 'text-red-400'
                      return (
                        <tr key={i} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                          <td className="px-4 py-3 font-medium text-white">{r.manager_name}</td>
                          <td className="px-4 py-3 text-right text-gray-300">{r.year}</td>
                          <td className={`px-4 py-3 text-right font-bold ${gradeColor}`}>{r.grade}</td>
                          <td className="px-4 py-3 text-right">{r.avg_roi.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-gray-400">{r.total_picks}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Best & Worst Picks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Best Picks */}
            {data.best_picks.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-green-400 mb-4">Best Draft Picks</h3>
                <div className="space-y-3">
                  {data.best_picks.map((p, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-gray-800 pb-2 last:border-0">
                      <div>
                        <span className="text-gray-500 text-xs mr-2">#{i + 1}</span>
                        <span className="text-white font-medium">{p.player_name}</span>
                        <span className="text-gray-500 text-xs ml-2">({p.position})</span>
                        <div className="text-gray-400 text-xs mt-0.5">
                          {p.manager_name} · {p.year} · Rd {p.round}, Pick {p.pick}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold">{p.fantasy_points.toFixed(1)} pts</div>
                        <div className="text-gray-500 text-xs">ROI: {p.roi.toFixed(1)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Worst Picks */}
            {data.worst_picks.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-red-400 mb-4">Worst Draft Picks</h3>
                <div className="space-y-3">
                  {data.worst_picks.map((p, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-gray-800 pb-2 last:border-0">
                      <div>
                        <span className="text-gray-500 text-xs mr-2">#{i + 1}</span>
                        <span className="text-white font-medium">{p.player_name}</span>
                        <span className="text-gray-500 text-xs ml-2">({p.position})</span>
                        <div className="text-gray-400 text-xs mt-0.5">
                          {p.manager_name} · {p.year} · Rd {p.round}, Pick {p.pick}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-red-400 font-bold">{p.fantasy_points.toFixed(1)} pts</div>
                        <div className="text-gray-500 text-xs">ROI: {p.roi.toFixed(1)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {!data.position_capital.length && !data.grades.length && (
            <div className="text-center text-gray-500 py-12">
              No draft data available. Run a sync to fetch draft picks from Yahoo.
            </div>
          )}
        </>
      )}
    </PageWrapper>
  )
}
