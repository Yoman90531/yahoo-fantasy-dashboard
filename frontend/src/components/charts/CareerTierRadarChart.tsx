import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts'
import type { ManagerTierRow } from '../../types'

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
]

const DIMENSIONS: Array<{
  key: keyof ManagerTierRow['dimension_scores']
  label: string
}> = [
  { key: 'win_pct', label: 'Win Rate' },
  { key: 'avg_ppg', label: 'Scoring' },
  { key: 'expected_win_pct', label: 'Expected Wins' },
  { key: 'championships', label: 'Championships' },
  { key: 'playoff_rate', label: 'Playoff Rate' },
]

interface Props {
  managers: ManagerTierRow[]
}

export default function CareerTierRadarChart({ managers }: Props) {
  const chartData = DIMENSIONS.map(dimension => {
    const row: Record<string, string | number> = { dimension: dimension.label }
    managers.forEach(manager => {
      row[manager.manager_name] = manager.dimension_scores[dimension.key]
    })
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={360}>
      <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis dataKey="dimension" tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
        {managers.map((manager, index) => (
          <Radar
            key={manager.manager_id}
            name={manager.manager_name}
            dataKey={manager.manager_name}
            stroke={COLORS[index % COLORS.length]}
            fill={COLORS[index % COLORS.length]}
            fillOpacity={0.12}
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
