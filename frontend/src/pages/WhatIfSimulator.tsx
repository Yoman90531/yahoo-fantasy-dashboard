import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ErrorBar,
} from 'recharts'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import YearFilter from '../components/cards/YearFilter'
import ExplainerCard from '../components/cards/ExplainerCard'
import { useApi } from '../hooks/useApi'
import { useSortedTable } from '../hooks/useSortedTable'
import { statsApi, seasonsApi } from '../api/client'
import type { WhatIfRow, SeasonSummary } from '../types'

type SortKey = 'manager_name' | 'actual_wins' | 'avg_sim_wins' | 'schedule_luck' | 'best_sim_wins' | 'worst_sim_wins'

export default function WhatIfSimulator() {
  const [year, setYear] = useState<number | undefined>(undefined)
  const { data: seasons } = useApi<SeasonSummary[]>(() => seasonsApi.list(), [])
  const { data, loading, error } = useApi<WhatIfRow[]>(() => statsApi.whatIf(year), [year])
  const { sorted, th } = useSortedTable<WhatIfRow, SortKey>(data, 'schedule_luck')

  const chartData = (data ?? [])
    .sort((a, b) => b.schedule_luck - a.schedule_luck)
    .map(r => ({
      name: r.manager_name.split(' ')[0],
      'Actual Wins': r.actual_wins,
      'Avg Simulated': r.avg_sim_wins,
      errorBarData: [r.avg_sim_wins - r.worst_sim_wins, r.best_sim_wins - r.avg_sim_wins],
    }))

  return (
    <PageWrapper
      title="What If Schedule Simulator"
      subtitle="How much did the schedule affect your record? Compare actual wins to what you'd average across 1,000 randomized schedules."
      dataScope="regular"
    >
      <ExplainerCard>
        Each week's actual scores are kept, but opponents are randomly reshuffled 1,000 times.
        Schedule Luck = actual wins minus average simulated wins. Positive means the schedule helped you; negative means it hurt.
      </ExplainerCard>

      <YearFilter seasons={seasons} year={year} onChange={setYear} />

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && data.length > 0 && (
        <>
          {/* Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Actual vs Simulated Wins</h3>
            <ResponsiveContainer width="100%" height={350}>
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
                  formatter={(v: number) => typeof v === 'number' ? v.toFixed(1) : v}
                />
                <Legend wrapperStyle={{ color: '#9ca3af' }} />
                <Bar dataKey="Actual Wins" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Avg Simulated" fill="#6b7280" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  {th('Manager', 'manager_name', 'left')}
                  {th('Actual W', 'actual_wins')}
                  {th('Avg Sim W', 'avg_sim_wins')}
                  {th('Best Sim', 'best_sim_wins')}
                  {th('Worst Sim', 'worst_sim_wins')}
                  {th('Schedule Luck', 'schedule_luck')}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.manager_id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.manager_name}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{r.actual_wins}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{r.avg_sim_wins.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-green-400">{r.best_sim_wins}</td>
                    <td className="px-4 py-3 text-right text-red-400">{r.worst_sim_wins}</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.schedule_luck > 0 ? 'text-green-400' : r.schedule_luck < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {r.schedule_luck > 0 ? '+' : ''}{r.schedule_luck.toFixed(1)}
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
