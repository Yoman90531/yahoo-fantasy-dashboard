import { CalendarDays, Clock3 } from 'lucide-react'

const KEY_DATES = [
  { date: 'Aug 17', event: 'Trade deadline', owner: 'Everyone' },
  { date: 'Aug 17', event: 'Lock ADP and send keeper costs', owner: 'Dan' },
  { date: 'Aug 24', event: 'Declare keepers', owner: 'Dan' },
  { date: 'Aug 24-27', event: 'Pick draft order', owner: 'Dan' },
  { date: 'By Aug 26', event: 'Submit rule proposals', owner: 'Jeremy' },
  { date: 'Aug 27', event: 'Set up draft on Yahoo', owner: 'Dan' },
  { date: 'By Aug 28', event: 'Vote on rules and ratify constitution', owner: 'Jeremy' },
  { date: 'Aug 28', event: 'Send dues', owner: 'Ryan' },
  { date: 'Aug 28, 6:00 PM ET', event: 'Draft', owner: 'Dan', featured: true },
]

export default function KeyDatesSection() {
  return (
    <section className="mt-10" aria-labelledby="key-dates-heading">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 border border-blue-700 bg-blue-950/60 rounded-lg flex items-center justify-center shrink-0">
          <CalendarDays size={18} className="text-blue-300" aria-hidden="true" />
        </div>
        <div>
          <h2 id="key-dates-heading" className="text-xl font-bold text-white">2026 Draft Calendar</h2>
          <p className="text-sm text-gray-400 mt-1">League business leading into draft night.</p>
        </div>
      </div>

      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <div className="hidden md:grid grid-cols-[180px_minmax(0,1fr)_120px] bg-gray-900 px-4 py-2.5 text-xs uppercase text-gray-500">
          <div>Date</div>
          <div>Event</div>
          <div>Owner</div>
        </div>
        {KEY_DATES.map(item => (
          <div
            key={`${item.date}-${item.event}`}
            className={`grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[180px_minmax(0,1fr)_120px] gap-x-4 gap-y-1 px-4 py-3 border-t border-gray-800 first:border-t-0 md:first:border-t ${
              item.featured ? 'bg-blue-950/50' : 'bg-gray-950'
            }`}
          >
            <div className={`text-sm font-medium md:order-none ${item.featured ? 'text-blue-300' : 'text-gray-300'}`}>
              {item.date}
            </div>
            <div className={`col-span-2 md:col-span-1 md:col-start-2 md:row-start-1 flex items-center gap-2 text-sm ${
              item.featured ? 'font-bold text-white' : 'text-gray-200'
            }`}>
              {item.featured && <Clock3 size={15} className="text-blue-400 shrink-0" aria-hidden="true" />}
              {item.event}
            </div>
            <div className="col-start-2 row-start-1 md:col-start-3 text-sm text-right md:text-left text-gray-500">
              {item.owner}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
