import LoadingSpinner from '../cards/LoadingSpinner'
import ErrorMessage from '../cards/ErrorMessage'
import { useApi } from '../../hooks/useApi'
import { statsApi } from '../../api/client'
import type { ThroneTracker } from '../../types'

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
  '#6366f1', '#d946ef', '#0ea5e9', '#22c55e', '#eab308', '#94a3b8',
]

export default function ChampionshipHistory() {
  const { data, loading, error } = useApi<ThroneTracker>(['throne-tracker'], () => statsApi.throneTracker())

  const colorMap: Record<string, string> = {}
  if (data) {
    const champions = [...new Set(data.timeline.map(entry => entry.champion_name).filter(Boolean))] as string[]
    champions.forEach((name, index) => {
      colorMap[name] = COLORS[index % COLORS.length]
    })
  }

  return (
    <div aria-labelledby="championship-history-heading">
      <div className="mb-4">
        <h3 id="championship-history-heading" className="text-lg font-semibold text-white">Championship Timeline</h3>
        <p className="text-xs text-gray-400 mt-1">Who held the belt each season.</p>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-2">
              {data.timeline.map(entry => {
                const backgroundColor = entry.champion_name ? colorMap[entry.champion_name] : '#374151'
                return (
                  <div
                    key={entry.year}
                    className="flex flex-col items-center shrink-0 group relative"
                    style={{ minWidth: 56 }}
                  >
                    <div
                      className="w-12 h-16 rounded-lg flex items-center justify-center text-xs font-bold text-white cursor-default transition-transform group-hover:scale-105"
                      style={{ backgroundColor }}
                    >
                      {entry.year}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 text-center leading-tight truncate w-14">
                      {entry.champion_name ?? '-'}
                    </div>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-gray-100 text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {entry.year}: {entry.champion_name ?? 'No champion'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {data.dynasties.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3">Back-to-Back Champions</h3>
              <div className="flex flex-wrap gap-3">
                {data.dynasties.map(dynasty => (
                  <div
                    key={`${dynasty.manager_name}-${dynasty.years.join('-')}`}
                    className="border border-gray-700 rounded-lg px-4 py-3"
                    style={{ borderLeftColor: colorMap[dynasty.manager_name] ?? '#6b7280', borderLeftWidth: 4 }}
                  >
                    <div className="text-white font-medium">{dynasty.manager_name}</div>
                    <div className="text-xs text-gray-400">{dynasty.years.join(', ')} ({dynasty.count} titles)</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-4">
            {Object.entries(colorMap).map(([name, color]) => (
              <span key={name} className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                {name}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
