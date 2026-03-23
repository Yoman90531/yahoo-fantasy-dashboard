import { useState } from 'react'
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

type WFSortKey = 'manager_name' | 'total_weeks' | 'first' | 'top_three_total' | 'top_half_total' | 'bottom_half' | 'bot_three_total' | 'last' | 'pct_top_half'

export default function WeeklyFinishDistribution() {
  const { data, loading, error } = useApi<WeeklyFinishRow[]>(() => statsApi.weeklyFinishDistribution(), [])
  const [sort, setSort] = useState<{ key: WFSortKey; dir: 1 | -1 }>({ key: 'pct_top_half', dir: -1 })

  const toggle = (key: WFSortKey) =>
    setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'manager_name' ? 1 : -1 })

  const getValue = (d: WeeklyFinishRow, key: WFSortKey): number | string => {
    if (key === 'manager_name') return d.manager_name
    if (key === 'top_three_total') return d.first + d.top_three
    if (key === 'top_half_total') return d.first + d.top_three + d.top_half
    if (key === 'bot_three_total') return d.bottom_three + d.last
    return d[key as keyof WeeklyFinishRow] as number
  }

  const sorted = [...(data ?? [])].sort((a, b) => {
    const av = getValue(a, sort.key)
    const bv = getValue(b, sort.key)
    if (typeof av === 'string') return av.localeCompare(bv as string) * sort.dir
    return ((av as number) - (bv as number)) * sort.dir
  })

  const th = (label: string, key: WFSortKey, cls = 'text-right') => (
    <th className={`px-4 py-3 ${cls} cursor-pointer hover:text-white select-none`} onClick={() => toggle(key)}>
      {label} {sort.key === key ? (sort.dir === -1 ? '↓' : '↑') : ''}
    </th>
  )

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
      subtitle="How often each manager finishes 1st, top-3, top-half, bottom-half, bottom-3, or last in weekly scoring."
      dataScope="regular"
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
                  {th('Manager', 'manager_name', 'text-left')}
                  {th('Weeks', 'total_weeks')}
                  <th className="px-4 py-3 text-right text-amber-400 cursor-pointer hover:text-amber-300 select-none" onClick={() => toggle('first')}>
                    1st {sort.key === 'first' ? (sort.dir === -1 ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-right text-emerald-400 cursor-pointer hover:text-emerald-300 select-none" onClick={() => toggle('top_three_total')}>
                    Top 3 {sort.key === 'top_three_total' ? (sort.dir === -1 ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-right text-blue-400 cursor-pointer hover:text-blue-300 select-none" onClick={() => toggle('top_half_total')}>
                    Top Half {sort.key === 'top_half_total' ? (sort.dir === -1 ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-right text-indigo-400 cursor-pointer hover:text-indigo-300 select-none" onClick={() => toggle('bottom_half')}>
                    Bot Half {sort.key === 'bottom_half' ? (sort.dir === -1 ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-right text-red-400 cursor-pointer hover:text-red-300 select-none" onClick={() => toggle('bot_three_total')}>
                    Bot 3 {sort.key === 'bot_three_total' ? (sort.dir === -1 ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-4 py-3 text-right text-gray-500 cursor-pointer hover:text-gray-300 select-none" onClick={() => toggle('last')}>
                    Last {sort.key === 'last' ? (sort.dir === -1 ? '↓' : '↑') : ''}
                  </th>
                  {th('% Top Half', 'pct_top_half')}
                </tr>
              </thead>
              <tbody>
                {sorted.map(d => (
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
