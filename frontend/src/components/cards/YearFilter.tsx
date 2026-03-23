import type { SeasonSummary } from '../../types'

interface Props {
  seasons: SeasonSummary[] | null
  year: number | undefined
  onChange: (year: number | undefined) => void
}

export default function YearFilter({ seasons, year, onChange }: Props) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <label className="text-gray-400 text-sm">Filter by season:</label>
      <select
        value={year ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
      >
        <option value="">All time</option>
        {[...(seasons ?? [])].reverse().map(s => (
          <option key={s.year} value={s.year}>{s.year}</option>
        ))}
      </select>
    </div>
  )
}
