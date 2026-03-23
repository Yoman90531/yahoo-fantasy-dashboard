import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { StandingsRow } from '../../types'

interface Props {
  rows: StandingsRow[]
}

type SortKey = 'final_rank' | 'wins' | 'losses' | 'ties' | 'points_for' | 'points_against' | 'pf_pa_ratio' | 'made_playoffs'

export default function StandingsTable({ rows }: Props) {
  const navigate = useNavigate()
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'final_rank', dir: 1 })

  const toggle = (key: SortKey) =>
    setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'final_rank' ? 1 : -1 })

  const sorted = [...rows].sort((a, b) => {
    let av: number, bv: number
    if (sort.key === 'pf_pa_ratio') {
      av = a.points_against > 0 ? a.points_for / a.points_against : 0
      bv = b.points_against > 0 ? b.points_for / b.points_against : 0
    } else if (sort.key === 'made_playoffs') {
      av = a.made_playoffs ? 1 : 0
      bv = b.made_playoffs ? 1 : 0
    } else {
      av = (a[sort.key] as number) ?? 999
      bv = (b[sort.key] as number) ?? 999
    }
    return (av - bv) * sort.dir
  })

  const th = (label: string, key: SortKey, align: 'left' | 'right' | 'center' = 'right') => (
    <th
      className={`px-4 py-3 text-${align} cursor-pointer hover:text-white select-none`}
      onClick={() => toggle(key)}
    >
      {label} {sort.key === key ? (sort.dir === -1 ? '↓' : '↑') : ''}
    </th>
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
            {th('Rank', 'final_rank', 'left')}
            <th className="px-4 py-3 text-left">Manager</th>
            <th className="px-4 py-3 text-left">Team</th>
            {th('W', 'wins')}
            {th('L', 'losses')}
            {th('T', 'ties')}
            {th('PF', 'points_for')}
            {th('PA', 'points_against')}
            {th('PF/PA', 'pf_pa_ratio')}
            {th('Playoffs', 'made_playoffs', 'center')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr
              key={i}
              onClick={() => navigate(`/managers/${r.manager_id}`)}
              className={`border-t border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${r.is_champion ? 'bg-amber-950/30' : ''}`}
            >
              <td className="px-4 py-3 text-gray-400">{r.final_rank ?? '—'}</td>
              <td className="px-4 py-3 font-medium text-white">
                {r.is_champion && <span className="mr-1">🏆</span>}
                {r.manager_name}
              </td>
              <td className="px-4 py-3 text-gray-400">{r.team_name ?? '—'}</td>
              <td className="px-4 py-3 text-right text-green-400">{r.wins}</td>
              <td className="px-4 py-3 text-right text-red-400">{r.losses}</td>
              <td className="px-4 py-3 text-right text-gray-400">{r.ties}</td>
              <td className="px-4 py-3 text-right">{r.points_for.toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-gray-400">{r.points_against.toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-blue-400">
                {r.points_against > 0 ? (r.points_for / r.points_against).toFixed(3) : '—'}
              </td>
              <td className="px-4 py-3 text-center">{r.made_playoffs ? '✓' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
