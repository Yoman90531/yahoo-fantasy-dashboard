import type { SeasonSummary } from '../../types'

interface Props {
  seasons: SeasonSummary[] | null
  yearStart: number | undefined
  yearEnd: number | undefined
  onChange: (yearStart: number | undefined, yearEnd: number | undefined) => void
}

export default function YearRangeFilter({ seasons, yearStart, yearEnd, onChange }: Props) {
  const years = [...(seasons ?? [])].reverse().map(s => s.year)
  const selectClass = "bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"

  return (
    <div className="flex items-center gap-3 mb-6 flex-wrap">
      <label className="text-gray-400 text-sm">Year range:</label>
      <select
        value={yearStart ?? ''}
        onChange={e => {
          const v = e.target.value ? Number(e.target.value) : undefined
          onChange(v, yearEnd && v && v > yearEnd ? v : yearEnd)
        }}
        className={selectClass}
      >
        <option value="">From (all)</option>
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <span className="text-gray-500">to</span>
      <select
        value={yearEnd ?? ''}
        onChange={e => {
          const v = e.target.value ? Number(e.target.value) : undefined
          onChange(yearStart && v && v < yearStart ? v : yearStart, v)
        }}
        className={selectClass}
      >
        <option value="">To (all)</option>
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      {(yearStart || yearEnd) && (
        <button
          onClick={() => onChange(undefined, undefined)}
          className="text-gray-500 hover:text-white text-sm underline"
        >
          Clear
        </button>
      )}
    </div>
  )
}
