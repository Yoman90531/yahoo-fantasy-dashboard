import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import ExplainerCard from '../components/cards/ExplainerCard'
import { useApi } from '../hooks/useApi'
import { useSortedTable } from '../hooks/useSortedTable'
import { statsApi } from '../api/client'
import type { LeagueParityRow } from '../types'

type SortKey = 'year' | 'scoring_std_dev' | 'scoring_range' | 'record_spread' | 'avg_points_per_game' | 'closest_standings_gap' | 'gini_coefficient' | 'num_teams'

export default function LeagueParity() {
  const { data, loading, error } = useApi<LeagueParityRow[]>(() => statsApi.leagueParity(), [])
  const { sorted, th } = useSortedTable<LeagueParityRow, SortKey>(data, 'year', 1)

  // Determine most/least competitive seasons by scoring std dev (lower = more parity)
  const mostCompetitive = data && data.length > 0
    ? data.reduce((best, row) => row.scoring_std_dev < best.scoring_std_dev ? row : best)
    : null
  const leastCompetitive = data && data.length > 0
    ? data.reduce((worst, row) => row.scoring_std_dev > worst.scoring_std_dev ? row : worst)
    : null

  const tooltipStyle = {
    backgroundColor: '#111827',
    border: '1px solid #374151',
    borderRadius: 8,
  }

  return (
    <PageWrapper
      title="League Parity"
      subtitle="How competitive and balanced was each season? Lower standard deviation and smaller spreads indicate tighter competition."
      dataScope="regular"
    >
      <ExplainerCard>
        We measure parity by looking at the spread in scoring and records across all managers each season. A low scoring standard deviation means everyone scored similarly. A small record spread means wins were evenly distributed. The Gini coefficient (0 = perfect equality, 1 = total inequality) captures overall scoring balance.
      </ExplainerCard>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && data.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {mostCompetitive && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Most Competitive Season</div>
                <div className="text-2xl font-bold text-green-400">{mostCompetitive.year}</div>
                <div className="text-gray-500 text-sm mt-1">
                  Scoring Std Dev: {mostCompetitive.scoring_std_dev.toFixed(2)} | Record Spread: {mostCompetitive.record_spread}
                </div>
              </div>
            )}
            {leastCompetitive && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Least Competitive Season</div>
                <div className="text-2xl font-bold text-red-400">{leastCompetitive.year}</div>
                <div className="text-gray-500 text-sm mt-1">
                  Scoring Std Dev: {leastCompetitive.scoring_std_dev.toFixed(2)} | Record Spread: {leastCompetitive.record_spread}
                </div>
              </div>
            )}
          </div>

          {/* Scoring Std Dev chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-4">Scoring Standard Deviation Over Time</h3>
            <p className="text-gray-500 text-xs mb-3">Lower values indicate more parity in total scoring across managers.</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis yAxisId="left" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" tick={{ fill: '#8b5cf6', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f3f4f6' }} />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                <Line type="monotone" dataKey="scoring_std_dev" name="Scoring Std Dev" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} yAxisId="left" />
                <Line type="monotone" dataKey="gini_coefficient" name="Gini Coefficient" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: '#8b5cf6' }} yAxisId="right" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Record Spread chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h3 className="text-white font-semibold mb-4">Record Spread Over Time</h3>
            <p className="text-gray-500 text-xs mb-3">The gap in wins between the best and worst records each season. Smaller = more competitive.</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="year" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f3f4f6' }} />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                <Line type="monotone" dataKey="record_spread" name="Record Spread (Wins)" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
                <Line type="monotone" dataKey="closest_standings_gap" name="Closest Standings Gap" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Data table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  {th('Year', 'year', 'left')}
                  {th('Teams', 'num_teams')}
                  {th('Scoring Std Dev', 'scoring_std_dev')}
                  {th('Scoring Range', 'scoring_range')}
                  {th('Record Spread', 'record_spread')}
                  {th('Avg PPG', 'avg_points_per_game')}
                  {th('Closest Gap', 'closest_standings_gap')}
                  {th('Gini', 'gini_coefficient')}
                </tr>
              </thead>
              <tbody>
                {sorted.map(row => (
                  <tr key={row.year} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{row.year}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{row.num_teams}</td>
                    <td className="px-4 py-3 text-right">{row.scoring_std_dev.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{row.scoring_range.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{row.record_spread}</td>
                    <td className="px-4 py-3 text-right">{row.avg_points_per_game.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{row.closest_standings_gap}</td>
                    <td className="px-4 py-3 text-right">{row.gini_coefficient.toFixed(4)}</td>
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
