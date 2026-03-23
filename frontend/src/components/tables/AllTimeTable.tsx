import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ManagerStats } from '../../types'

type SortKey = keyof ManagerStats

interface Props {
  managers: ManagerStats[]
}

export default function AllTimeTable({ managers }: Props) {
  const navigate = useNavigate()
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'championships', dir: -1 })

  const sorted = [...managers].sort((a, b) => {
    const av = a[sort.key] as number
    const bv = b[sort.key] as number
    return (av - bv) * sort.dir
  })

  const toggle = (key: SortKey) =>
    setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 })

  const th = (label: string, key: SortKey) => (
    <th
      className="px-4 py-3 text-right cursor-pointer hover:text-white select-none"
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
            <th className="px-4 py-3 text-left">Manager</th>
            {th('Seasons', 'seasons_played')}
            {th('W', 'total_wins')}
            {th('L', 'total_losses')}
            {th('Win%', 'win_pct')}
            {th('PF', 'total_points_for')}
            {th('PA', 'total_points_against')}
            {th('PF/PA', 'pf_pa_ratio')}
            {th('Champs', 'championships')}
            {th('Playoffs', 'playoff_appearances')}
            {th('Drought', 'current_drought')}
          </tr>
        </thead>
        <tbody>
          {sorted.map(m => (
            <tr
              key={m.id}
              onClick={() => navigate(`/managers/${m.id}`)}
              className="border-t border-gray-800 hover:bg-gray-800 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 font-medium text-white">
                {m.championships > 0 && <span className="mr-1">🏆</span>}
                {m.display_name}
              </td>
              <td className="px-4 py-3 text-right text-gray-400">{m.seasons_played}</td>
              <td className="px-4 py-3 text-right text-green-400">{m.total_wins}</td>
              <td className="px-4 py-3 text-right text-red-400">{m.total_losses}</td>
              <td className="px-4 py-3 text-right">{(m.win_pct * 100).toFixed(1)}%</td>
              <td className="px-4 py-3 text-right">{m.total_points_for.toFixed(0)}</td>
              <td className="px-4 py-3 text-right text-gray-400">{m.total_points_against.toFixed(0)}</td>
              <td className="px-4 py-3 text-right text-blue-400">
                {m.pf_pa_ratio > 0 ? m.pf_pa_ratio.toFixed(3) : '—'}
              </td>
              <td className="px-4 py-3 text-right text-amber-400 font-bold">{m.championships || '—'}</td>
              <td className="px-4 py-3 text-right">{m.playoff_appearances}</td>
              <td className="px-4 py-3 text-right text-gray-400">{m.current_drought} yrs</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
