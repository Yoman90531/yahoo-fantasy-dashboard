import PageWrapper from '../components/layout/PageWrapper'
import StatCard from '../components/cards/StatCard'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi } from '../api/client'
import type { ThroneTracker as ThroneTrackerData } from '../types'

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
  '#6366f1', '#d946ef', '#0ea5e9', '#22c55e', '#eab308', '#94a3b8',
]

export default function ThroneTracker() {
  const { data, loading, error } = useApi<ThroneTrackerData>(() => statsApi.throneTracker(), [])

  // Assign stable colors to champions
  const colorMap: Record<string, string> = {}
  if (data) {
    const uniqueChamps = [...new Set(data.timeline.map(e => e.champion_name).filter(Boolean))] as string[]
    uniqueChamps.forEach((name, i) => {
      colorMap[name] = COLORS[i % COLORS.length]
    })
  }

  return (
    <PageWrapper
      title="Throne Tracker"
      subtitle="Championship timeline — who wore the crown each year."
      dataScope="all"
    >
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Active Champion" value={data.active_champion ?? 'N/A'} accent />
            <StatCard
              label="Most Titles"
              value={data.most_titles.manager_name ?? 'N/A'}
              sub={`${data.most_titles.count} championship${data.most_titles.count !== 1 ? 's' : ''}`}
            />
            <StatCard label="Seasons Tracked" value={data.timeline.length} />
            <StatCard
              label="Dynasties"
              value={data.dynasties.length}
              sub={data.dynasties.length > 0 ? `${data.dynasties[0].manager_name} (${data.dynasties[0].count})` : 'None'}
            />
          </div>

          {/* Timeline */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8">
            <h2 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Championship Timeline</h2>
            <div className="flex gap-1 overflow-x-auto pb-2">
              {data.timeline.map(entry => {
                const bg = entry.champion_name ? colorMap[entry.champion_name] : '#374151'
                return (
                  <div
                    key={entry.year}
                    className="flex flex-col items-center shrink-0 group relative"
                    style={{ minWidth: 56 }}
                  >
                    <div
                      className="w-12 h-16 rounded-lg flex items-center justify-center text-xs font-bold text-white cursor-default transition-transform group-hover:scale-110"
                      style={{ backgroundColor: bg }}
                    >
                      {entry.year}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 text-center leading-tight truncate w-14">
                      {entry.champion_name ?? '—'}
                    </div>
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-gray-100 text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {entry.year}: {entry.champion_name ?? 'No champion'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dynasty callouts */}
          {data.dynasties.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-8">
              <h2 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Dynasties (Back-to-Back+)</h2>
              <div className="flex flex-wrap gap-4">
                {data.dynasties.map((d, i) => (
                  <div
                    key={i}
                    className="border border-gray-700 rounded-lg px-4 py-3 flex items-center gap-3"
                    style={{ borderLeftColor: colorMap[d.manager_name] ?? '#6b7280', borderLeftWidth: 4 }}
                  >
                    <div>
                      <div className="text-white font-medium">{d.manager_name}</div>
                      <div className="text-xs text-gray-400">{d.years.join(', ')} ({d.count} titles)</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            {Object.entries(colorMap).map(([name, color]) => (
              <span key={name} className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                {name}
              </span>
            ))}
          </div>
        </>
      )}
    </PageWrapper>
  )
}
