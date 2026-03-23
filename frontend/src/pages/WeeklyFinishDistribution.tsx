import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi } from '../api/client'
import type { WeeklyFinishRow } from '../types'

const BUCKETS = [
  { key: 'first',        label: '1st',         color: '#f59e0b' },
  { key: 'top_three',    label: '2nd–3rd',      color: '#10b981' },
  { key: 'top_half',     label: 'Top Half',     color: '#3b82f6' },
  { key: 'bottom_half',  label: 'Bottom Half',  color: '#6366f1' },
  { key: 'bottom_three', label: 'Bottom 3',     color: '#ef4444' },
  { key: 'last',         label: 'Last',         color: '#7f1d1d' },
]

export default function WeeklyFinishDistribution() {
  const { data, loading, error } = useApi<WeeklyFinishRow[]>(() => statsApi.weeklyFinishDistribution(), [])

  const chartData = data?.map(d => ({
    name: d.manager_name,
    first: d.first,
    top_three: d.top_three,
    top_half: d.top_half,
    bottom_half: d.bottom_half,
    bottom_three: d.bottom_three,
    last: d.last,
  })) ?? []

  return (
    <PageWrapper
      title="Weekly Finish Distribution"
      subtitle="How often each manager finishes 1st, top-3, top-half, bottom-half, bottom-3, or last in weekly scoring — regular season only, all time."
    >
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && (
        <>
          {/* Stacked bar chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="name"
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Legend wrapperStyle={{ paddingTop: 16, fontSize: 11, color: '#9ca3af' }} />
                {BUCKETS.map(b => (
                  <Bar key={b.key} dataKey={b.key} name={b.label} stackId="a" fill={b.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Manager</th>
                  <th className="px-4 py-3 text-right">Weeks</th>
                  <th className="px-4 py-3 text-right text-amber-400">1st</th>
                  <th className="px-4 py-3 text-right text-emerald-400">Top 3</th>
                  <th className="px-4 py-3 text-right text-blue-400">Top Half</th>
                  <th className="px-4 py-3 text-right text-indigo-400">Bot Half</th>
                  <th className="px-4 py-3 text-right text-red-400">Bot 3</th>
                  <th className="px-4 py-3 text-right text-gray-500">Last</th>
                  <th className="px-4 py-3 text-right">% Top Half</th>
                </tr>
              </thead>
              <tbody>
                {data.map(d => (
                  <tr key={d.manager_id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{d.manager_name}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{d.total_weeks}</td>
                    <td className="px-4 py-3 text-right text-amber-400">{d.first}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{d.first + d.top_three}</td>
                    <td className="px-4 py-3 text-right text-blue-400">{d.first + d.top_three + d.top_half}</td>
                    <td className="px-4 py-3 text-right text-indigo-400">{d.bottom_half}</td>
                    <td className="px-4 py-3 text-right text-red-400">{d.bottom_three + d.last}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{d.last}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">{d.pct_top_half}%</td>
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
