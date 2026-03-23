import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts'
import type { PowerRankingRow } from '../../types'

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16',
]

const DIMENSION_LABELS: Record<string, string> = {
  win_rate: 'Win Rate',
  scoring: 'Scoring',
  consistency: 'Consistency',
  luck_adjusted: 'Skill (Luck-Adj)',
  playoff_success: 'Playoff Success',
}

interface Props {
  managers: PowerRankingRow[]
}

export default function PowerRadarChart({ managers }: Props) {
  const dimensions = Object.keys(DIMENSION_LABELS)

  const chartData = dimensions.map(dim => {
    const row: Record<string, string | number> = {
      dimension: DIMENSION_LABELS[dim],
    }
    managers.forEach(m => {
      row[m.manager_name] = m.dimensions[dim as keyof typeof m.dimensions]
    })
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis dataKey="dimension" tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
        {managers.map((m, i) => (
          <Radar
            key={m.manager_id}
            name={m.manager_name}
            dataKey={m.manager_name}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#e5e7eb' }}
          itemStyle={{ color: '#e5e7eb' }}
        />
        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
