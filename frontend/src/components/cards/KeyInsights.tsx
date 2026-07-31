import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, ChevronDown, Lightbulb } from 'lucide-react'
import { KEY_INSIGHTS, type InsightKey } from '../../content/keyInsights'
import { statsApi } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import type { InsightRankings } from '../../types'

interface Props {
  insightKey: InsightKey
}

export default function KeyInsights({ insightKey }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [rankingsOpen, setRankingsOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const insights = KEY_INSIGHTS[insightKey]
  const { data: rankingData } = useApi<InsightRankings>(
    ['insight-rankings', insightKey],
    () => statsApi.insightRankings(insightKey),
  )
  const rankingGroups = rankingData?.groups ?? []
  const selectedGroup = rankingGroups.find(group => group.metric_key === selectedMetric)
    ?? rankingGroups[0]

  return (
    <section
      aria-label="Key insights"
      className="mb-6 overflow-hidden rounded-xl border border-blue-900/60 bg-gradient-to-br from-blue-950/45 to-gray-900"
    >
      <div className="hidden items-center justify-between gap-4 border-b border-blue-900/40 px-5 py-4 md:flex">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-blue-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-100">Key Insights</h2>
        </div>
        <span className="rounded-full border border-blue-800/70 bg-blue-950/60 px-2.5 py-1 text-[11px] font-medium text-blue-300">
          All-time · 2012–2025
        </span>
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left md:hidden"
        aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
      >
        <span className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold uppercase tracking-wider text-blue-100">Key Insights</span>
          <span className="text-[10px] font-medium text-blue-300">2012–2025</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-blue-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div className={`${expanded ? 'block' : 'hidden'} border-t border-blue-900/40 px-4 py-4 md:block md:border-t-0 md:px-5 md:py-5`}>
        <ul className="grid gap-x-8 gap-y-3 lg:grid-cols-2">
          {insights.map(insight => (
            <li key={insight} className="flex gap-3 text-sm leading-relaxed text-gray-300">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
              <span>{insight}</span>
            </li>
          ))}
        </ul>

        {rankingGroups.length > 0 && (
          <div className="mt-5 border-t border-blue-900/40 pt-4">
            <button
              type="button"
              onClick={() => setRankingsOpen(value => !value)}
              aria-expanded={rankingsOpen}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300 hover:text-blue-200"
            >
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              {rankingsOpen ? 'Hide complete rankings' : 'View complete rankings'}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${rankingsOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {rankingsOpen && selectedGroup && (
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-700 bg-gray-950/70">
                <div className="flex gap-2 overflow-x-auto border-b border-gray-800 p-3 no-scrollbar">
                  {rankingGroups.map(group => (
                    <button
                      key={group.metric_key}
                      type="button"
                      onClick={() => setSelectedMetric(group.metric_key)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        selectedGroup.metric_key === group.metric_key
                          ? 'border-blue-500 bg-blue-950 text-blue-200'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
                      }`}
                    >
                      {group.title}
                    </button>
                  ))}
                </div>
                <div className="border-b border-gray-800 px-4 py-3">
                  <h3 className="text-sm font-semibold text-white">{selectedGroup.title}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">{selectedGroup.description}</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {selectedGroup.entries.map(entry => (
                    <Link
                      key={entry.manager_id}
                      to={`/managers/${entry.manager_id}`}
                      className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-gray-800/80 px-4 py-2.5 text-sm last:border-b-0 hover:bg-gray-800/70"
                    >
                      <span className={`font-mono text-xs ${
                        entry.rank <= 3 ? 'text-amber-400' : 'text-gray-600'
                      }`}>
                        #{entry.rank}
                      </span>
                      <span className="font-medium text-gray-200">{entry.manager_name}</span>
                      <span className="font-mono text-blue-300">{entry.display_value}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
