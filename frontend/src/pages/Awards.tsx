import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi, seasonsApi } from '../api/client'
import type { SeasonAwards, SeasonSummary } from '../types'

export default function Awards() {
  const [year, setYear] = useState<number | undefined>(undefined)
  const { data: seasons } = useApi<SeasonSummary[]>(() => seasonsApi.list(), [])
  const { data, loading, error } = useApi<SeasonAwards>(() => statsApi.awards(year), [year])

  return (
    <PageWrapper
      title="Awards"
      subtitle="Auto-generated superlatives — the best (and worst) of each season."
      dataScope="all"
    >
      {/* Year filter */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-gray-400 text-sm">Season:</label>
        <select
          value={year ?? ''}
          onChange={e => setYear(e.target.value ? Number(e.target.value) : undefined)}
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        >
          <option value="">All time</option>
          {[...(seasons ?? [])].reverse().map(s => (
            <option key={s.year} value={s.year}>{s.year}</option>
          ))}
        </select>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && data.awards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.awards.map((award, i) => (
            <div
              key={i}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{award.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">{award.award_name}</div>
                  <div className="text-lg font-bold text-white mt-1 truncate">{award.manager_name}</div>
                  <div className="text-brand-400 font-medium text-sm mt-1">{award.value}</div>
                  <div className="text-xs text-gray-500 mt-2">{award.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.awards.length === 0 && (
        <p className="text-gray-500">No award data available for this selection.</p>
      )}
    </PageWrapper>
  )
}
