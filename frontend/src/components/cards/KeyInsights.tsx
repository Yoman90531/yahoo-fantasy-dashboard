import { useState } from 'react'
import { ChevronDown, Lightbulb } from 'lucide-react'
import { KEY_INSIGHTS, type InsightKey } from '../../content/keyInsights'

interface Props {
  insightKey: InsightKey
}

export default function KeyInsights({ insightKey }: Props) {
  const [expanded, setExpanded] = useState(true)
  const insights = KEY_INSIGHTS[insightKey]

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
      </div>
    </section>
  )
}
