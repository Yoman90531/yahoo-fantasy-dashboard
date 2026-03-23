import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { H2HMatrix } from '../../types'

interface Props {
  data: H2HMatrix
}

function getColor(winPct: number | undefined): string {
  if (winPct === undefined) return '#111827' // diagonal
  if (winPct >= 0.7) return '#166534'
  if (winPct >= 0.55) return '#15803d'
  if (winPct >= 0.45) return '#374151'
  if (winPct >= 0.3) return '#991b1b'
  return '#7f1d1d'
}

const CELL = 40
const LABEL_W = 120
const HEADER_H = 140

export default function H2HHeatmap({ data }: Props) {
  const { managers, records } = data
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const navigate = useNavigate()

  const lookup: Record<string, { wins: number; losses: number; ties: number; win_pct: number }> = {}
  for (const r of records) {
    lookup[`${r.manager_a_id}-${r.manager_b_id}`] = {
      wins: r.wins, losses: r.losses, ties: r.ties, win_pct: r.win_pct,
    }
  }

  function getRecord(aId: number, bId: number) {
    if (aId === bId) return null
    const [lo, hi] = aId < bId ? [aId, bId] : [bId, aId]
    const r = lookup[`${lo}-${hi}`]
    if (!r) return null
    if (aId < bId) return { wins: r.wins, losses: r.losses, ties: r.ties, win_pct: r.win_pct }
    const total = r.wins + r.losses + r.ties || 1
    return { wins: r.losses, losses: r.wins, ties: r.ties, win_pct: r.losses / total }
  }

  return (
    <div className="overflow-auto">
      <p className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm bg-green-900 border border-green-700" />
        Click any colored cell to see the full rivalry breakdown
      </p>
      <table
        style={{
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          width: LABEL_W + managers.length * CELL,
        }}
      >
        <thead>
          <tr>
            {/* corner */}
            <th style={{ width: LABEL_W, minWidth: LABEL_W, padding: 0 }}>
              {/* spacer to force row height */}
              <div style={{ height: HEADER_H }} />
            </th>
            {managers.map(col => (
              <th
                key={col.id}
                style={{ width: CELL, minWidth: CELL, padding: 0 }}
              >
                <div style={{
                  height: HEADER_H,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: 6,
                }}>
                  <span
                    style={{
                      display: 'inline-block',
                      transformOrigin: '50% 100%',
                      transform: 'rotate(-45deg)',
                      whiteSpace: 'nowrap',
                      fontSize: 11,
                      color: '#9ca3af',
                    }}
                  >
                    {col.name}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {managers.map(row => (
            <tr key={row.id}>
              <td
                style={{
                  width: LABEL_W,
                  minWidth: LABEL_W,
                  height: CELL,
                  fontSize: 11,
                  color: '#9ca3af',
                  textAlign: 'right',
                  paddingRight: 8,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {row.name}
              </td>
              {managers.map(col => {
                const rec = getRecord(row.id, col.id)
                const bg = getColor(rec ? rec.win_pct : undefined)
                const tipText = rec
                  ? `${row.name} vs ${col.name}: ${rec.wins}-${rec.losses}${rec.ties ? `-${rec.ties}` : ''} (${(rec.win_pct * 100).toFixed(0)}%)`
                  : ''

                const cellKey = `${row.id}-${col.id}`
                const isHovered = hovered === cellKey
                return (
                  <td
                    key={col.id}
                    style={{
                      width: CELL,
                      minWidth: CELL,
                      height: CELL,
                      backgroundColor: isHovered && rec ? '#ffffff22' : bg,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      color: '#e5e7eb',
                      border: isHovered && rec ? '2px solid #60a5fa' : '1px solid #030712',
                      cursor: rec ? 'pointer' : 'default',
                      transition: 'background-color 0.1s, border-color 0.1s',
                    }}
                    onClick={() => rec && navigate(`/rivalry?a=${row.id}&b=${col.id}`)}
                    onMouseEnter={e => {
                      if (rec) {
                        setHovered(cellKey)
                        setTooltip({ x: e.clientX, y: e.clientY, text: tipText })
                      }
                    }}
                    onMouseLeave={() => {
                      setHovered(null)
                      setTooltip(null)
                    }}
                  >
                    {rec ? rec.wins : ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {tooltip && (
        <div
          className="fixed z-50 bg-gray-800 text-gray-100 text-xs px-3 py-2 rounded-lg shadow-xl pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 30, maxWidth: 280 }}
        >
          {tooltip.text}
        </div>
      )}

      <div className="flex items-center gap-3 mt-4 text-xs text-gray-400">
        <span>Win %:</span>
        {[
          { label: '≥70%', color: '#166534' },
          { label: '55–70%', color: '#15803d' },
          { label: '~50%', color: '#374151' },
          { label: '30–45%', color: '#991b1b' },
          { label: '<30%', color: '#7f1d1d' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded-sm" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
