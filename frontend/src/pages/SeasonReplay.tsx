import { useState, useEffect, useMemo } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { useAppStore } from '../store/appStore'
import { seasonsApi } from '../api/client'
import type { MatchupOut, SeasonDetail } from '../types'

const BLOWOUT_THRESHOLD = 30
const CLOSE_GAME_THRESHOLD = 5

function MatchupCard({ matchup }: { matchup: MatchupOut }) {
  const team1Won = matchup.winner_manager_id === matchup.team1_manager_id
  const team2Won = matchup.winner_manager_id === matchup.team2_manager_id
  const isTie = matchup.winner_manager_id === null
  const isBlowout = matchup.margin >= BLOWOUT_THRESHOLD
  const isClose = matchup.margin > 0 && matchup.margin <= CLOSE_GAME_THRESHOLD

  let borderClass = 'border-gray-800'
  if (isBlowout) borderClass = 'border-red-500/40'
  else if (isClose) borderClass = 'border-yellow-500/40'
  else if (matchup.is_championship) borderClass = 'border-brand-500/60'
  else if (matchup.is_playoff) borderClass = 'border-purple-500/40'

  return (
    <div className={`bg-gray-900 border ${borderClass} rounded-xl p-4 flex flex-col gap-3`}>
      {/* Badges row */}
      <div className="flex items-center gap-2 min-h-[20px]">
        {matchup.is_championship && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-700 text-white px-2 py-0.5 rounded">
            Championship
          </span>
        )}
        {matchup.is_playoff && !matchup.is_championship && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-700 text-white px-2 py-0.5 rounded">
            Playoff
          </span>
        )}
        {isBlowout && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-red-900/60 text-red-300 px-2 py-0.5 rounded">
            Blowout
          </span>
        )}
        {isClose && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-yellow-900/60 text-yellow-300 px-2 py-0.5 rounded">
            Nail-biter
          </span>
        )}
      </div>

      {/* Team 1 */}
      <div className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${team1Won ? 'bg-green-900/20 ring-1 ring-green-500/30' : 'bg-gray-800/50'}`}>
        <div className="flex flex-col min-w-0">
          <span className={`text-sm font-medium truncate ${team1Won ? 'text-green-400' : isTie ? 'text-gray-300' : 'text-gray-400'}`}>
            {matchup.team1_manager_name}
            {team1Won && <span className="ml-1.5 text-green-500 text-xs">W</span>}
          </span>
          {matchup.team1_team_name && (
            <span className="text-[11px] text-gray-500 truncate">{matchup.team1_team_name}</span>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className={`text-lg font-bold tabular-nums ${team1Won ? 'text-green-400' : 'text-gray-300'}`}>
            {matchup.team1_points.toFixed(2)}
          </span>
          {matchup.team1_projected != null && (
            <div className="text-[10px] text-gray-500">
              proj {matchup.team1_projected.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      {/* VS divider */}
      <div className="text-center text-[10px] text-gray-600 uppercase tracking-widest -my-1">vs</div>

      {/* Team 2 */}
      <div className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${team2Won ? 'bg-green-900/20 ring-1 ring-green-500/30' : 'bg-gray-800/50'}`}>
        <div className="flex flex-col min-w-0">
          <span className={`text-sm font-medium truncate ${team2Won ? 'text-green-400' : isTie ? 'text-gray-300' : 'text-gray-400'}`}>
            {matchup.team2_manager_name}
            {team2Won && <span className="ml-1.5 text-green-500 text-xs">W</span>}
          </span>
          {matchup.team2_team_name && (
            <span className="text-[11px] text-gray-500 truncate">{matchup.team2_team_name}</span>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className={`text-lg font-bold tabular-nums ${team2Won ? 'text-green-400' : 'text-gray-300'}`}>
            {matchup.team2_points.toFixed(2)}
          </span>
          {matchup.team2_projected != null && (
            <div className="text-[10px] text-gray-500">
              proj {matchup.team2_projected.toFixed(1)}
            </div>
          )}
        </div>
      </div>

      {/* Margin */}
      <div className="text-center text-xs text-gray-500">
        {isTie ? 'Tied' : `Margin: ${matchup.margin.toFixed(2)}`}
      </div>
    </div>
  )
}

export default function SeasonReplay() {
  const { seasons, setSeasons } = useAppStore()
  const [year, setYear] = useState<number | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<number | string>('all')

  useEffect(() => {
    if (!seasons.length) seasonsApi.list().then(setSeasons)
  }, [])

  useEffect(() => {
    if (seasons.length && !year) {
      setYear(seasons[seasons.length - 1].year)
    }
  }, [seasons])

  // Fetch season detail to know total weeks
  const { data: seasonDetail } = useApi<SeasonDetail>(
    () => (year ? seasonsApi.get(year) : Promise.resolve(null)),
    [year],
  )

  // Fetch all matchups for the season (no week filter -- we filter client-side)
  const { data: allMatchups, loading, error } = useApi<MatchupOut[]>(
    () => (year ? seasonsApi.matchups(year) : Promise.resolve([])),
    [year],
  )

  // Compute max week from data
  const maxWeek = useMemo(() => {
    if (!allMatchups || allMatchups.length === 0) return 0
    return Math.max(...allMatchups.map(m => m.week))
  }, [allMatchups])

  // Build week options
  const weekOptions = useMemo(() => {
    const opts: { value: string | number; label: string }[] = [
      { value: 'all', label: 'All Weeks' },
    ]
    const regWeeks = seasonDetail?.num_regular_season_weeks ?? maxWeek
    for (let w = 1; w <= maxWeek; w++) {
      const isPlayoff = w > regWeeks
      opts.push({
        value: w,
        label: `Week ${w}${isPlayoff ? ' (Playoff)' : ''}`,
      })
    }
    return opts
  }, [maxWeek, seasonDetail])

  // Filter matchups
  const filteredMatchups = useMemo(() => {
    if (!allMatchups) return []
    if (selectedWeek === 'all') return allMatchups
    return allMatchups.filter(m => m.week === Number(selectedWeek))
  }, [allMatchups, selectedWeek])

  // Group by week for "all weeks" view
  const groupedByWeek = useMemo(() => {
    const groups: Record<number, MatchupOut[]> = {}
    for (const m of filteredMatchups) {
      if (!groups[m.week]) groups[m.week] = []
      groups[m.week].push(m)
    }
    return Object.entries(groups)
      .map(([week, matchups]) => ({ week: Number(week), matchups }))
      .sort((a, b) => a.week - b.week)
  }, [filteredMatchups])

  // Summary stats for selected view
  const stats = useMemo(() => {
    if (!filteredMatchups.length) return null
    const totalGames = filteredMatchups.length
    const blowouts = filteredMatchups.filter(m => m.margin >= BLOWOUT_THRESHOLD).length
    const closeGames = filteredMatchups.filter(m => m.margin > 0 && m.margin <= CLOSE_GAME_THRESHOLD).length
    const avgMargin = filteredMatchups.reduce((sum, m) => sum + m.margin, 0) / totalGames
    const highScore = Math.max(
      ...filteredMatchups.flatMap(m => [m.team1_points, m.team2_points]),
    )
    const playoffGames = filteredMatchups.filter(m => m.is_playoff).length
    return { totalGames, blowouts, closeGames, avgMargin, highScore, playoffGames }
  }, [filteredMatchups])

  // Reset week when year changes
  useEffect(() => {
    setSelectedWeek('all')
  }, [year])

  const regWeeks = seasonDetail?.num_regular_season_weeks ?? maxWeek

  return (
    <PageWrapper title="Season Replay" subtitle="Browse every matchup week by week.">
      {/* Selectors */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">Season:</label>
          <select
            value={year ?? ''}
            onChange={e => setYear(Number(e.target.value))}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          >
            {[...seasons].reverse().map(s => (
              <option key={s.year} value={s.year}>
                {s.year}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">Week:</label>
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          >
            {weekOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {/* Summary stats */}
      {stats && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-white">{stats.totalGames}</div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">Matchups</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-white">{stats.avgMargin.toFixed(1)}</div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">Avg Margin</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-white">{stats.highScore.toFixed(1)}</div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">High Score</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-red-400">{stats.blowouts}</div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">Blowouts</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-yellow-400">{stats.closeGames}</div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">Nail-biters</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-purple-400">{stats.playoffGames}</div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider">Playoff</div>
          </div>
        </div>
      )}

      {/* Matchup cards */}
      {!loading && groupedByWeek.map(group => (
        <div key={group.week} className="mb-8">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>Week {group.week}</span>
            {group.week > regWeeks && (
              <span className="text-[10px] font-bold uppercase bg-purple-700 text-white px-2 py-0.5 rounded">
                Playoff
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {group.matchups.map(m => (
              <MatchupCard key={m.id} matchup={m} />
            ))}
          </div>
        </div>
      ))}

      {!loading && filteredMatchups.length === 0 && !error && (
        <div className="text-center text-gray-500 py-12">
          No matchups found for this selection.
        </div>
      )}
    </PageWrapper>
  )
}
