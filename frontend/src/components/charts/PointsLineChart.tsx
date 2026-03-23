import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const COLORS = [
  '#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6',
  '#ec4899','#14b8a6','#f97316','#6366f1','#84cc16',
  '#06b6d4','#a78bfa',
]

interface Props {
  data: Record<string, number | string>[]
  lines: { key: string; label: string }[]
  xKey?: string
  yLabel?: string
}

export default function PointsLineChart({ data, lines, xKey = 'year', yLabel = 'Points' }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey={xKey} stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }} />
        <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#f3f4f6' }} />
        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
        {lines.map((l, i) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.label}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
