import { useState, useEffect } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import StandingsTable from '../components/tables/StandingsTable'
import WinRateBarChart from '../components/charts/WinRateBarChart'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { useAppStore } from '../store/appStore'
import { seasonsApi } from '../api/client'
import type { SeasonDetail } from '../types'

export default function SeasonView() {
  const { seasons, setSeasons } = useAppStore()
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => {
    if (!seasons.length) seasonsApi.list().then(setSeasons)
  }, [])

  useEffect(() => {
    if (seasons.length && !year) {
      setYear(seasons[seasons.length - 1].year)
    }
  }, [seasons])

  const { data: season, loading, error } = useApi<SeasonDetail>(
    () => (year ? seasonsApi.get(year) : Promise.resolve(null)),
    [year],
  )

  const pfData = season?.standings.map(r => ({
    name: r.manager_name,
    value: r.points_for,
  })) ?? []

  const ratioData = season?.standings.map(r => ({
    name: r.manager_name,
    value: r.points_against > 0 ? parseFloat((r.points_for / r.points_against).toFixed(3)) : 0,
  })) ?? []

  return (
    <PageWrapper title="Season View" subtitle="Select a season to see final standings and points.">
      {/* Year selector */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-gray-400 text-sm">Season:</label>
        <select
          value={year ?? ''}
          onChange={e => setYear(Number(e.target.value))}
          className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        >
          {[...seasons].reverse().map(s => (
            <option key={s.year} value={s.year}>
              {s.year} {s.champion_name ? `— Champion: ${s.champion_name}` : ''}
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {season && (
        <>
          <div className="flex gap-4 text-sm text-gray-400 mb-6">
            {season.num_teams && <span>{season.num_teams} teams</span>}
            {season.num_regular_season_weeks && <span>{season.num_regular_season_weeks} regular season weeks</span>}
            {season.num_playoff_teams && <span>{season.num_playoff_teams}-team playoffs</span>}
          </div>

          <StandingsTable rows={season.standings} />

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-6">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Points Scored by Manager
            </h2>
            <WinRateBarChart data={pfData} label="Points For" formatValue={v => v.toFixed(0)} />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-6">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              PF / PA Ratio by Manager
            </h2>
            <WinRateBarChart data={ratioData} label="PF/PA" formatValue={v => v.toFixed(3)} />
          </div>
        </>
      )}
    </PageWrapper>
  )
}
