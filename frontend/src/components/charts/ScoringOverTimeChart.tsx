import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { SeasonScoringData, InflationPoint } from '../../types'

const MGR_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
  '#6366f1', '#d946ef', '#0ea5e9', '#22c55e', '#eab308', '#94a3b8',
]

interface Props {
  scoring: SeasonScoringData
  inflation: InflationPoint[]
}

export default function ScoringOverTimeChart({ scoring, inflation }: Props) {
  // Merge inflation avg into the season rows
  const avgByYear: Record<number, number> = {}
  for (const pt of inflation) {
    // avg_weekly_score is per-week; multiply by ~16 weeks to get season-comparable total
    avgByYear[pt.year] = pt.avg_weekly_score
  }

  const data = scoring.seasons.map(row => ({
    ...row,
    _leagueAvgWeekly: avgByYear[row.year as number] ?? null,
  }))

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="year"
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
        />
        <YAxis
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          width={55}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#f3f4f6' }}
          formatter={(v: number, name: string) => [
            v != null ? v.toFixed(1) : '—',
            name,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 8 }} />
        {scoring.managers.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={MGR_COLORS[i % MGR_COLORS.length]}
            strokeWidth={1.5}
            dot={false}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
