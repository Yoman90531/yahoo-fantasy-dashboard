import { useState } from 'react'
import LoadingSpinner from '../cards/LoadingSpinner'
import ErrorMessage from '../cards/ErrorMessage'
import { useApi } from '../../hooks/useApi'
import { statsApi } from '../../api/client'
import type { SeasonAwards, SeasonSummary } from '../../types'

interface Props {
  seasons: SeasonSummary[]
}

export default function AwardsSection({ seasons }: Props) {
  const [year, setYear] = useState<number | undefined>(undefined)
  const { data, loading, error } = useApi<SeasonAwards>(() => statsApi.awards(year), [year])

  return (
    <section className="mt-8" aria-labelledby="awards-heading">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h2 id="awards-heading" className="text-lg font-semibold text-white">League Superlatives</h2>
          <p className="text-xs text-gray-400 mt-1">The best, worst, and hardest-to-explain performances.</p>
        </div>
        <label className="flex items-center gap-2 text-gray-400 text-sm">
          Season
          <select
            value={year ?? ''}
            onChange={event => setYear(event.target.value ? Number(event.target.value) : undefined)}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          >
            <option value="">All time</option>
            {[...seasons].reverse().map(season => (
              <option key={season.year} value={season.year}>{season.year}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && data.awards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.awards.map(award => (
            <div
              key={`${award.award_name}-${award.manager_id}`}
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
    </section>
  )
}
