import type { ScoreDistributionRow } from '../../types'

interface Props {
  data: ScoreDistributionRow[]
}

const BAR_H = 28
const BAR_GAP = 10
const LABEL_W = 90
const PLOT_W = 520
const PAD = { top: 24, bottom: 40, left: LABEL_W + 12, right: 32 }

const MGR_COLORS = [
  '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
  '#ec4899','#06b6d4','#84cc16','#f97316','#14b8a6',
  '#6366f1','#d946ef','#0ea5e9','#22c55e','#eab308','#94a3b8',
]

export default function BoxPlotChart({ data }: Props) {
  const allVals = data.flatMap(d => [d.min, ...d.outliers, d.max])
  const domainMin = Math.floor(Math.min(...allVals) / 10) * 10
  const domainMax = Math.ceil(Math.max(...allVals) / 10) * 10

  const toX = (v: number) => ((v - domainMin) / (domainMax - domainMin)) * PLOT_W

  const svgW = PAD.left + PLOT_W + PAD.right
  const svgH = PAD.top + data.length * (BAR_H + BAR_GAP) + PAD.bottom

  // Gridlines every 20 pts
  const ticks: number[] = []
  for (let v = domainMin; v <= domainMax; v += 20) ticks.push(v)

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ fontFamily: 'sans-serif', overflow: 'visible' }}>
      {/* Gridlines + x-axis labels */}
      {ticks.map(t => {
        const x = PAD.left + toX(t)
        return (
          <g key={t}>
            <line x1={x} y1={PAD.top} x2={x} y2={svgH - PAD.bottom} stroke="#1f2937" strokeWidth={1} />
            <text x={x} y={svgH - PAD.bottom + 14} textAnchor="middle" fill="#6b7280" fontSize={10}>{t}</text>
          </g>
        )
      })}

      {/* X-axis label */}
      <text x={PAD.left + PLOT_W / 2} y={svgH - 4} textAnchor="middle" fill="#6b7280" fontSize={11}>
        Weekly Score
      </text>

      {/* Box plots */}
      {data.map((d, i) => {
        const y = PAD.top + i * (BAR_H + BAR_GAP)
        const cy = y + BAR_H / 2
        const color = MGR_COLORS[i % MGR_COLORS.length]

        const xMin = PAD.left + toX(d.min)
        const xQ1 = PAD.left + toX(d.q1)
        const xMed = PAD.left + toX(d.median)
        const xMean = PAD.left + toX(d.mean)
        const xQ3 = PAD.left + toX(d.q3)
        const xMax = PAD.left + toX(d.max)

        return (
          <g key={d.manager_id}>
            {/* Manager label */}
            <text x={PAD.left - 8} y={cy + 4} textAnchor="end" fill="#d1d5db" fontSize={11}>
              {d.manager_name}
            </text>

            {/* Whisker line */}
            <line x1={xMin} y1={cy} x2={xMax} y2={cy} stroke={color} strokeWidth={1.5} strokeOpacity={0.5} />

            {/* Whisker caps */}
            <line x1={xMin} y1={cy - 6} x2={xMin} y2={cy + 6} stroke={color} strokeWidth={1.5} />
            <line x1={xMax} y1={cy - 6} x2={xMax} y2={cy + 6} stroke={color} strokeWidth={1.5} />

            {/* IQR box */}
            <rect
              x={xQ1} y={y + 4}
              width={xQ3 - xQ1} height={BAR_H - 8}
              fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.5} rx={2}
            />

            {/* Median line */}
            <line x1={xMed} y1={y + 3} x2={xMed} y2={y + BAR_H - 3} stroke={color} strokeWidth={2.5} />

            {/* Mean dot */}
            <circle cx={xMean} cy={cy} r={3} fill="#f3f4f6" stroke={color} strokeWidth={1} />

            {/* Outliers */}
            {d.outliers.map((v, oi) => (
              <circle key={oi} cx={PAD.left + toX(v)} cy={cy} r={3} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.7} />
            ))}
          </g>
        )
      })}

      {/* Legend */}
      <g transform={`translate(${PAD.left}, ${svgH - PAD.bottom + 22})`}>
        <rect x={0} y={0} width={10} height={10} fill="#6b7280" fillOpacity={0.3} stroke="#6b7280" strokeWidth={1} />
        <text x={14} y={9} fill="#6b7280" fontSize={10}>IQR (25–75%)</text>
        <line x1={80} y1={5} x2={100} y2={5} stroke="#6b7280" strokeWidth={2.5} />
        <text x={104} y={9} fill="#6b7280" fontSize={10}>Median</text>
        <circle cx={163} cy={5} r={3} fill="#f3f4f6" stroke="#6b7280" strokeWidth={1} />
        <text x={170} y={9} fill="#6b7280" fontSize={10}>Mean</text>
        <circle cx={210} cy={5} r={3} fill="none" stroke="#6b7280" strokeWidth={1.5} />
        <text x={217} y={9} fill="#6b7280" fontSize={10}>Outlier</text>
      </g>
    </svg>
  )
}
