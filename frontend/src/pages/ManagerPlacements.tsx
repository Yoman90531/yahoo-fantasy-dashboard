import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Medal, Scale, Trophy } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import YearRangeFilter from '../components/cards/YearRangeFilter'
import StatCard from '../components/cards/StatCard'
import { useApi } from '../hooks/useApi'
import { useSortedTable } from '../hooks/useSortedTable'
import { seasonsApi, statsApi } from '../api/client'
import type { ManagerPlacementRow, SeasonSummary } from '../types'

type SortKey =
  | 'placement_rank'
  | 'manager_name'
  | 'average_finish'
  | 'median_finish'
  | 'finish_percentile'
  | 'best_finish'
  | 'championships'
  | 'runner_ups'
  | 'top_three_finishes'
  | 'last_place_finishes'
  | 'playoff_rate'
  | 'ranked_seasons'

export default function ManagerPlacements() {
  const navigate = useNavigate()
  const [yearStart, setYearStart] = useState<number | undefined>()
  const [yearEnd, setYearEnd] = useState<number | undefined>()
  const { data: seasons } = useApi<SeasonSummary[]>(['seasons'], () => seasonsApi.list())
  const { data, loading, error } = useApi<ManagerPlacementRow[]>(
    ['manager-placements', yearStart, yearEnd],
    () => statsApi.managerPlacements(yearStart, yearEnd),
  )
  const { sorted, th } = useSortedTable<ManagerPlacementRow, SortKey>(
    data,
    'average_finish',
    1,
  )

  const podiumLeader = data
    ? [...data].sort((a, b) => b.top_three_finishes - a.top_three_finishes)[0]
    : null
  const championLeader = data
    ? [...data].sort((a, b) => b.championships - a.championships)[0]
    : null
  const eraLeader = data
    ? [...data].sort((a, b) => (b.finish_percentile ?? 0) - (a.finish_percentile ?? 0))[0]
    : null

  return (
    <PageWrapper
      title="Finishes & Placements"
      subtitle="Official final standings, including the championship and consolation brackets."
      dataScope="playoffs"
    >
      <YearRangeFilter
        seasons={seasons}
        yearStart={yearStart}
        yearEnd={yearEnd}
        onChange={(start, end) => {
          setYearStart(start)
          setYearEnd(end)
        }}
      />

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && data.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Best Average Finish"
              value={data[0].average_finish.toFixed(2)}
              sub={data[0].manager_name}
              accent
            />
            <StatCard
              label="Era-Adjusted Leader"
              value={`${eraLeader?.finish_percentile?.toFixed(1) ?? '—'}%`}
              sub={eraLeader?.manager_name}
            />
            <StatCard
              label="Most Podiums"
              value={podiumLeader?.top_three_finishes ?? 0}
              sub={podiumLeader?.manager_name}
            />
            <StatCard
              label="Most Championships"
              value={championLeader?.championships ?? 0}
              sub={championLeader?.manager_name}
            />
          </div>

          <details className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-5 mb-6">
            <summary className="cursor-pointer text-sm font-semibold text-gray-300 uppercase tracking-wider">
              How placements are calculated
            </summary>
            <div className="grid gap-3 md:grid-cols-3 mt-4">
              <div className="rounded-lg bg-gray-800/70 p-4">
                <Trophy className="h-5 w-5 text-amber-400 mb-2" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-white mb-1">Final means final</h3>
                <p className="text-xs leading-relaxed text-gray-400">
                  The official Yahoo end-of-season standing is used, so playoff and consolation results are included.
                </p>
              </div>
              <div className="rounded-lg bg-gray-800/70 p-4">
                <Scale className="h-5 w-5 text-blue-400 mb-2" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-white mb-1">League-size adjustment</h3>
                <p className="text-xs leading-relaxed text-gray-400">
                  Finish percentile makes different eras comparable: first is 100%, last is 0%, and the middle scales between them.
                </p>
              </div>
              <div className="rounded-lg bg-gray-800/70 p-4">
                <Medal className="h-5 w-5 text-purple-400 mb-2" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-white mb-1">Every season counts once</h3>
                <p className="text-xs leading-relaxed text-gray-400">
                  Average and median finish give each completed season equal weight. The season count stays visible beside every résumé.
                </p>
              </div>
            </div>
          </details>

          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  {th('#', 'placement_rank', 'left')}
                  {th('Manager', 'manager_name', 'left')}
                  {th('Avg Finish', 'average_finish')}
                  {th('Era Adjusted', 'finish_percentile')}
                  {th('Median', 'median_finish')}
                  {th('Best', 'best_finish')}
                  {th('Titles', 'championships')}
                  {th('Runner-up', 'runner_ups')}
                  {th('Top 3', 'top_three_finishes')}
                  {th('Last', 'last_place_finishes')}
                  {th('Playoff %', 'playoff_rate')}
                  {th('Seasons', 'ranked_seasons')}
                </tr>
              </thead>
              <tbody>
                {sorted.map(row => (
                  <tr
                    key={row.manager_id}
                    onClick={() => navigate(`/managers/${row.manager_id}`)}
                    className="border-t border-gray-800 hover:bg-gray-800/70 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-left text-gray-500">#{row.placement_rank}</td>
                    <td className="px-4 py-3 text-left font-medium text-white">
                      {row.championships > 0 && <span className="mr-1" aria-hidden="true">🏆</span>}
                      {row.manager_name}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand-400">
                      {row.average_finish.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-400">
                      {row.finish_percentile?.toFixed(1) ?? '—'}%
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.median_finish.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.best_finish}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-400">{row.championships || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.runner_ups || '—'}</td>
                    <td className="px-4 py-3 text-right text-purple-300">{row.top_three_finishes}</td>
                    <td className="px-4 py-3 text-right text-red-300">{row.last_place_finishes || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{(row.playoff_rate * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right text-gray-500">{row.ranked_seasons}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageWrapper>
  )
}
