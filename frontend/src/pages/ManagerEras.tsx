import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi } from '../api/client'
import type { EraBlock, EraManagerRow } from '../types'

const ERA_COLORS = ['text-blue-400', 'text-emerald-400', 'text-amber-400']

type EraSortKey = 'manager_name' | 'seasons' | 'wins' | 'losses' | 'win_pct' | 'avg_pf' | 'championships' | 'playoff_appearances'

function EraTable({ managers }: { managers: EraManagerRow[] }) {
  const [sort, setSort] = useState<{ key: EraSortKey; dir: 1 | -1 }>({ key: 'win_pct', dir: -1 })

  const toggle = (key: EraSortKey) =>
    setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'manager_name' ? 1 : -1 })

  const sorted = [...managers].sort((a, b) => {
    if (sort.key === 'manager_name') return a.manager_name.localeCompare(b.manager_name) * sort.dir
    return ((a[sort.key] as number) - (b[sort.key] as number)) * sort.dir
  })

  const th = (label: string, key: EraSortKey, align: 'left' | 'right' = 'right') => (
    <th className={`px-4 py-2 text-${align} cursor-pointer hover:text-white select-none`} onClick={() => toggle(key)}>
      {label} {sort.key === key ? (sort.dir === -1 ? '↓' : '↑') : ''}
    </th>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-800">
            <th className="px-5 py-2 text-left w-6">#</th>
            {th('Manager', 'manager_name', 'left')}
            {th('Seasons', 'seasons')}
            {th('W', 'wins')}
            {th('L', 'losses')}
            {th('Win%', 'win_pct')}
            {th('Avg PF/Wk', 'avg_pf')}
            {th('Champs', 'championships')}
            {th('Playoffs', 'playoff_appearances')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m, mi) => (
            <tr
              key={m.manager_id}
              className={`border-t border-gray-800/50 transition-colors ${
                mi === 0 ? 'bg-amber-950/20' : 'hover:bg-gray-800/40'
              }`}
            >
              <td className="px-5 py-2.5 text-gray-500 text-xs">{mi + 1}</td>
              <td className="px-4 py-2.5 font-medium text-white">
                {mi === 0 && <span className="mr-1 text-amber-400">👑</span>}
                {m.manager_name}
              </td>
              <td className="px-4 py-2.5 text-right text-gray-400">{m.seasons}</td>
              <td className="px-4 py-2.5 text-right text-green-400">{m.wins}</td>
              <td className="px-4 py-2.5 text-right text-red-400">{m.losses}</td>
              <td className="px-4 py-2.5 text-right font-semibold">
                {(m.win_pct * 100).toFixed(1)}%
              </td>
              <td className="px-4 py-2.5 text-right text-blue-400">{m.avg_pf.toFixed(1)}</td>
              <td className="px-4 py-2.5 text-right text-amber-400 font-bold">
                {m.championships > 0 ? m.championships : '—'}
              </td>
              <td className="px-4 py-2.5 text-right text-gray-300">{m.playoff_appearances}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ManagerEras() {
  const { data, loading, error } = useApi<EraBlock[]>(() => statsApi.managerEras(), [])

  return (
    <PageWrapper
      title="Manager Eras"
      subtitle="Who dominated which time period? Each era covers a distinct chapter of the league's history."
      dataScope="regular"
    >
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && (
        <div className="flex flex-col gap-8">
          {data.map((era, ei) => (
            <div key={era.era_name} className="bg-gray-900 border border-gray-800 rounded-xl">
              {/* Era header */}
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <span className={`text-base font-bold ${ERA_COLORS[ei % ERA_COLORS.length]}`}>
                    {era.era_name}
                  </span>
                  <span className="text-gray-500 text-sm ml-3">{era.years}</span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">
                  {era.num_seasons} season{era.num_seasons !== 1 ? 's' : ''}
                </span>
              </div>

              <EraTable managers={era.managers} />
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
