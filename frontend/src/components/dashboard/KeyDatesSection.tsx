import { BellRing, CalendarDays, Clock3 } from 'lucide-react'

const KEY_DATES = [
  { date: 'TBD', event: 'Trade deadline', owner: 'Everyone' },
  { date: 'TBD', event: 'Lock ADP and send keeper costs', owner: 'Dan' },
  { date: 'TBD', event: 'Declare keepers', owner: 'Dan' },
  { date: 'TBD', event: 'Pick draft order', owner: 'Dan' },
  { date: 'TBD', event: 'Submit rule proposals', owner: 'Jeremy' },
  { date: 'TBD', event: 'Set up draft on Yahoo', owner: 'Dan' },
  { date: 'TBD', event: 'Vote on rules and ratify constitution', owner: 'Jeremy' },
  { date: 'TBD', event: 'Send dues', owner: 'Kang' },
  { date: 'TBD', event: 'Draft', owner: 'Dan', featured: true },
]

export default function KeyDatesSection() {
  return (
    <section
      aria-labelledby="key-dates-heading"
      className="relative mb-6 overflow-hidden rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-950/45 via-gray-950 to-orange-950/25 p-4 shadow-lg shadow-amber-950/20 ring-1 ring-amber-400/10 md:p-5"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/50 bg-amber-950/70 shadow-inner">
            <CalendarDays size={19} className="text-amber-300" aria-hidden="true" />
          </div>
          <div>
            <h2 id="key-dates-heading" className="text-xl font-bold text-white">2026 Draft Calendar</h2>
            <p className="mt-1 text-sm text-amber-100/70">League action items leading into draft night.</p>
          </div>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full border border-amber-500/40 bg-amber-950/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-200">
          <BellRing size={13} aria-hidden="true" />
          Pre-draft action center
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-amber-900/60 bg-gray-950/70">
        <div className="hidden md:grid grid-cols-[180px_minmax(0,1fr)_120px] border-b border-amber-900/50 bg-amber-950/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-amber-200/60">
          <div>Date</div>
          <div>Event</div>
          <div>Owner</div>
        </div>
        {KEY_DATES.map(item => (
          <div
            key={`${item.date}-${item.event}`}
            className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-t border-gray-800/80 px-4 py-3 first:border-t-0 md:grid-cols-[180px_minmax(0,1fr)_120px] ${
              item.featured ? 'bg-gradient-to-r from-amber-950/80 to-orange-950/50' : 'bg-gray-950/60'
            }`}
          >
            <div className={`text-sm font-medium md:order-none ${item.featured ? 'text-amber-300' : 'text-gray-300'}`}>
              {item.date}
            </div>
            <div className={`col-span-2 md:col-span-1 md:col-start-2 md:row-start-1 flex items-center gap-2 text-sm ${
              item.featured ? 'font-bold text-white' : 'text-gray-200'
            }`}>
              {item.featured && <Clock3 size={15} className="shrink-0 text-amber-300" aria-hidden="true" />}
              {item.event}
              {item.featured && (
                <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  Draft night
                </span>
              )}
            </div>
            <div className={`col-start-2 row-start-1 text-right text-sm md:col-start-3 md:text-left ${
              item.featured ? 'font-medium text-amber-100/70' : 'text-gray-500'
            }`}>
              {item.owner}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
