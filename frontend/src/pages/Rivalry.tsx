import { useSearchParams } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts'
import PageWrapper from '../components/layout/PageWrapper'
import StatCard from '../components/cards/StatCard'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi } from '../api/client'
import type { RivalryDetail } from '../types'

export default function Rivalry() {
  const [params] = useSearchParams()
  const aId = Number(params.get('a'))
  const bId = Number(params.get('b'))

  const { data, loading, error } = useApi<RivalryDetail>(
    () => statsApi.rivalry(aId, bId),
    [aId, bId],
  )

  if (!aId || !bId) {
    return (
      <PageWrapper title="Rivalry" subtitle="Select two managers from the Head-to-Head page.">
        <p className="text-gray-500">No managers selected. Go to Head-to-Head and click a cell.</p>
      </PageWrapper>
    )
  }

  const streakName = (holder: string) =>
    holder === 'a' ? data?.manager_a_name : data?.manager_b_name

  return (
    <PageWrapper
      title={data ? `${data.manager_a_name} vs ${data.manager_b_name}` : 'Rivalry'}
      subtitle="Full head-to-head rivalry history."
    >
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="All-Time Record"
              value={`${data.summary.a_wins}-${data.summary.b_wins}${data.summary.ties ? `-${data.summary.ties}` : ''}`}
              sub={`${data.manager_a_name} perspective`}
              accent
            />
            <StatCard
              label="Current Streak"
              value={`${streakName(data.current_streak.holder)}`}
              sub={`${data.current_streak.length} in a row`}
            />
            <StatCard
              label="Biggest Blowout"
              value={data.biggest_blowout ? `${data.biggest_blowout.margin.toFixed(1)} pts` : 'N/A'}
              sub={data.biggest_blowout ? `${data.biggest_blowout.year} Wk ${data.biggest_blowout.week}` : ''}
            />
            <StatCard
              label="Closest Game"
              value={data.closest_game ? `${data.closest_game.margin.toFixed(1)} pts` : 'N/A'}
              sub={data.closest_game ? `${data.closest_game.year} Wk ${data.closest_game.week}` : ''}
            />
          </div>

          {/* Trends: wins per season */}
          {data.trends.length > 1 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Wins Per Season</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                  <Line type="monotone" dataKey="a_wins" name={data.manager_a_name} stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="b_wins" name={data.manager_b_name} stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Trends: PF comparison */}
          {data.trends.length > 1 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
              <h2 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Points Scored Per Season</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                  <Bar dataKey="a_pf" name={data.manager_a_name} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="b_pf" name={data.manager_b_name} fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* All matchups table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-left">Week</th>
                  <th className="px-4 py-3 text-right">{data.manager_a_name}</th>
                  <th className="px-4 py-3 text-right">{data.manager_b_name}</th>
                  <th className="px-4 py-3 text-right">Margin</th>
                  <th className="px-4 py-3 text-center">Type</th>
                </tr>
              </thead>
              <tbody>
                {data.matchups.map((m, i) => (
                  <tr key={i} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 text-gray-300">{m.year}</td>
                    <td className="px-4 py-3 text-gray-300">{m.week}</td>
                    <td className={`px-4 py-3 text-right font-medium ${m.winner === 'a' ? 'text-green-400' : 'text-gray-400'}`}>
                      {m.a_points.toFixed(1)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${m.winner === 'b' ? 'text-green-400' : 'text-gray-400'}`}>
                      {m.b_points.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{m.margin.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center">
                      {m.is_playoff && <span className="text-xs bg-brand-700 text-white px-2 py-0.5 rounded-full">Playoff</span>}
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
