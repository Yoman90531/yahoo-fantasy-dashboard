import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpenCheck,
  Dices,
  ExternalLink,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'

import ErrorMessage from '../components/cards/ErrorMessage'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import PageWrapper from '../components/layout/PageWrapper'
import { keeperApi } from '../api/client'
import { useApi } from '../hooks/useApi'
import type { components } from '../types/api.generated'
import {
  resolveTeamKeepers,
  simulateAdpDraft,
  type KeeperAssignments,
  type ResolvedAssignments,
  type SimulatorKeeper,
} from '../domain/keeperSimulator'

type KeeperBoardData = components['schemas']['KeeperBoard']
type KeeperCandidate = components['schemas']['KeeperCandidate']
type KeeperTeam = components['schemas']['KeeperTeam']

const STATUS_STYLES = {
  eligible: 'border-emerald-700/60 bg-emerald-950/50 text-emerald-300',
  ineligible: 'border-red-800/60 bg-red-950/50 text-red-300',
  review: 'border-amber-700/60 bg-amber-950/50 text-amber-300',
}

const VALUE_STYLES: Record<string, string> = {
  Elite: 'text-emerald-300',
  Strong: 'text-green-400',
  Good: 'text-blue-300',
  Fair: 'text-gray-300',
  Poor: 'text-red-300',
  Unrated: 'text-gray-500',
}

type KeeperSortKey =
  | 'player_name'
  | 'position'
  | 'nfl_team'
  | 'manager_name'
  | 'draft_round'
  | 'keeper_history'
  | 'market_value'
  | 'eligibility_status'
  | 'base_keeper_round'
  | 'cost_basis'
  | 'value_rounds'

type KeeperSortValue = string | number | boolean | null

const TEXT_SORT_KEYS = new Set<KeeperSortKey>([
  'player_name',
  'position',
  'nfl_team',
  'manager_name',
  'cost_basis',
  'eligibility_status',
])

function keeperCostBasis(candidate: KeeperCandidate) {
  if (!candidate.history_known) return 'History review'
  if (candidate.is_dynasty) return 'Dynasty value locked'
  if (candidate.kept_previous_year) return 'Current ADP'
  if (candidate.draft_round !== null) return '2025 draft round'
  return 'FA/waiver rule'
}

function keeperSortValue(candidate: KeeperCandidate, key: KeeperSortKey): KeeperSortValue {
  if (key === 'eligibility_status') {
    return { eligible: 1, review: 2, ineligible: 3 }[candidate.eligibility_status]
  }
  if (key === 'keeper_history') {
    return candidate.kept_previous_year ? candidate.consecutive_keeper_years : -1
  }
  if (key === 'market_value') return candidate.adp_rank
  if (key === 'cost_basis') return keeperCostBasis(candidate)
  return candidate[key]
}

function keeperHistory(candidate: KeeperCandidate) {
  if (!candidate.history_known) return { label: 'Unknown', detail: 'History not loaded' }
  if (!candidate.kept_previous_year) return { label: 'Not kept', detail: 'First-time option' }

  const cost = candidate.previous_keeper_cost_round
    ? `2025 cost: Round ${candidate.previous_keeper_cost_round}`
    : '2025 cost unavailable'
  const year = candidate.is_dynasty
    ? candidate.dynasty_year
    : candidate.consecutive_keeper_years

  return {
    label: candidate.is_dynasty ? 'Dynasty' : 'Standard',
    detail: `${cost}${year ? ` · Year ${year}` : ''}`,
  }
}

function compareKeeperValues(a: KeeperSortValue, b: KeeperSortValue, direction: 1 | -1) {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b, undefined, { numeric: true }) * direction
  }
  return (Number(a) - Number(b)) * direction
}

function toSelection(candidate: KeeperCandidate): SimulatorKeeper {
  return {
    candidateId: candidate.candidate_id,
    playerName: candidate.player_name,
    position: candidate.position,
    nflTeam: candidate.nfl_team,
    adpRank: candidate.adp_rank,
    baseRound: candidate.base_keeper_round,
    designatedDynasty: candidate.is_dynasty === true,
  }
}

function shuffle<T>(values: T[]) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function RulesRecap({ data }: { data: KeeperBoardData }) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl border border-amber-500/45 bg-gradient-to-br from-amber-950/45 via-gray-950 to-orange-950/25 p-4 shadow-lg shadow-amber-950/20 md:p-5">
      <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/45 bg-amber-950/70">
              <BookOpenCheck size={19} className="text-amber-300" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Keeper rules at a glance</h2>
              <p className="text-xs text-amber-100/60">
                Keepers due Sep 4 · Draft order Sep 5 · Draft Sep 8 at 8:30 PM ET.
              </p>
            </div>
          </div>
          <ul className="grid gap-2 text-sm text-gray-300 md:grid-cols-2">
            {data.rules.recap.map(rule => (
              <li key={rule} className="flex gap-2">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 rounded-xl border border-gray-800 bg-gray-950/75 p-3 text-xs text-gray-400 lg:w-72">
          <div className="mb-1 font-semibold uppercase tracking-wider text-gray-500">ADP formula</div>
          <div className="font-mono text-sm text-amber-200">ceil(consensus rank ÷ 14)</div>
          <div className="mt-2">Ranks 1–14 are round 1, 15–28 are round 2, and so on.</div>
          <div className="mt-3 border-t border-gray-800 pt-3">
            <div className="font-semibold text-gray-300">
              {data.adp_snapshot ? 'Locked ADP snapshot' : 'ADP snapshot needed'}
            </div>
            {data.adp_snapshot && (
              <div className="mt-0.5 text-gray-500">
                {new Date(data.adp_snapshot.captured_at).toLocaleString()} · {data.adp_snapshot.player_count} players
              </div>
            )}
          </div>
          <a
            href={data.rules.adp_url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 font-medium text-amber-300 hover:text-amber-200"
          >
            FantasyPros Half-PPR ADP <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}

function KeeperBoard({ data }: { data: KeeperBoardData }) {
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')
  const [eligibilityFilter, setEligibilityFilter] = useState('all')
  const [sort, setSort] = useState<{ key: KeeperSortKey; direction: 1 | -1 }>({
    key: 'value_rounds',
    direction: -1,
  })

  const positions = useMemo(
    () => Array.from(new Set(data.candidates.map(candidate => candidate.position))).sort(),
    [data.candidates],
  )

  const candidates = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...data.candidates]
      .filter(candidate => {
        if (teamFilter !== 'all' && candidate.roster_team_key !== teamFilter) return false
        if (positionFilter !== 'all' && candidate.position !== positionFilter) return false
        if (eligibilityFilter !== 'all' && candidate.eligibility_status !== eligibilityFilter) return false
        if (!query) return true
        return [candidate.player_name, candidate.manager_name, candidate.roster_team_name, candidate.nfl_team]
          .filter(Boolean)
          .some(value => value!.toLowerCase().includes(query))
      })
      .sort((a, b) => {
        const comparison = compareKeeperValues(
          keeperSortValue(a, sort.key),
          keeperSortValue(b, sort.key),
          sort.direction,
        )
        return comparison || a.player_name.localeCompare(b.player_name)
      })
  }, [data.candidates, eligibilityFilter, positionFilter, search, sort, teamFilter])

  function toggleSort(key: KeeperSortKey) {
    setSort(current =>
      current.key === key
        ? { key, direction: (current.direction * -1) as 1 | -1 }
        : { key, direction: TEXT_SORT_KEYS.has(key) ? 1 : -1 },
    )
  }

  function sortableHeader(
    label: string,
    key: KeeperSortKey,
    align: 'left' | 'center' | 'right' = 'left',
    sticky = false,
  ) {
    const active = sort.key === key
    const Icon = active ? (sort.direction === 1 ? ArrowUp : ArrowDown) : ArrowUpDown
    const alignmentClass = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    }[align]
    return (
      <th
        aria-sort={active ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none'}
        className={`${sticky ? 'sticky left-0 z-10 bg-gray-950' : ''} px-3 py-3 ${alignmentClass}`}
      >
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className={`inline-flex w-full items-center gap-1.5 hover:text-white ${
            align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
          }`}
        >
          <span>{label}</span>
          <Icon size={13} className={active ? 'text-amber-400' : 'text-gray-700'} aria-hidden="true" />
        </button>
      </th>
    )
  }

  return (
    <section aria-labelledby="keeper-board-heading">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="keeper-board-heading" className="text-xl font-bold text-white">Keeper Board</h2>
          <p className="mt-1 text-sm text-gray-400">The 2025 final rosters, reassigned to their 2026 owners and repriced for a {data.rules.league_size}-team league.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative">
            <span className="sr-only">Search players</span>
            <Search size={15} className="absolute left-3 top-2.5 text-gray-500" aria-hidden="true" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search players"
              className="h-9 w-full rounded-lg border border-gray-700 bg-gray-900 pl-9 pr-3 text-sm text-white outline-none focus:border-amber-500"
            />
          </label>
          <select
            aria-label="Filter by fantasy team"
            value={teamFilter}
            onChange={event => setTeamFilter(event.target.value)}
            className="h-9 rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-gray-200"
          >
            <option value="all">All 2025 teams</option>
            {data.teams.filter(team => !team.is_expansion).map(team => (
              <option key={team.key} value={team.key}>{team.name}</option>
            ))}
          </select>
          <select
            aria-label="Filter by position"
            value={positionFilter}
            onChange={event => setPositionFilter(event.target.value)}
            className="h-9 rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-gray-200"
          >
            <option value="all">All positions</option>
            {positions.map(position => <option key={position} value={position}>{position}</option>)}
          </select>
          <select
            aria-label="Filter by eligibility"
            value={eligibilityFilter}
            onChange={event => setEligibilityFilter(event.target.value)}
            className="h-9 rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-gray-200"
          >
            <option value="all">All eligibility</option>
            <option value="eligible">Eligible</option>
            <option value="review">Review</option>
            <option value="ineligible">Ineligible</option>
          </select>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-amber-800/50 bg-amber-950/25 px-4 py-3 text-sm text-amber-100/80">
        <span className="font-semibold text-amber-200">2026 keeper cost</span> is the player&apos;s rule-based cost.
        If selected keepers share a round, the Draft Simulator calculates the final conflict-adjusted cost.
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full text-sm">
            <thead className="bg-gray-950 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                {sortableHeader('Player', 'player_name', 'left', true)}
                {sortableHeader('Position', 'position')}
                {sortableHeader('NFL team', 'nfl_team')}
                {sortableHeader('2026 owner', 'manager_name')}
                {sortableHeader('2025 acquisition', 'draft_round')}
                {sortableHeader('2025 keeper history', 'keeper_history')}
                {sortableHeader('2026 market value', 'market_value')}
                {sortableHeader('2026 keeper cost', 'base_keeper_round')}
                {sortableHeader('Cost determined by', 'cost_basis')}
                {sortableHeader('Value vs. market', 'value_rounds')}
                {sortableHeader('Eligibility', 'eligibility_status')}
              </tr>
            </thead>
            <tbody>
              {candidates.map(candidate => {
                const history = keeperHistory(candidate)
                const marketRound = candidate.adp_round && candidate.adp_round <= data.rules.draft_rounds
                  ? `Round ${candidate.adp_round}`
                  : candidate.adp_round
                    ? 'Outside draft'
                    : 'No ADP match'
                return (
                  <tr key={candidate.candidate_id} className="border-t border-gray-800/90 hover:bg-gray-800/60">
                    <td className="sticky left-0 bg-gray-900 px-4 py-3 font-medium text-white">{candidate.player_name}</td>
                    <td className="px-3 py-3 text-gray-300">{candidate.position}</td>
                    <td className="px-3 py-3 text-gray-300">{candidate.nfl_team ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-300">{candidate.manager_name}</td>
                    <td className="px-3 py-3 text-gray-300">
                      {candidate.draft_round ? `Drafted R${candidate.draft_round}` : 'FA/Waiver'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-200">{history.label}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{history.detail}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-200">{candidate.adp_rank ? `#${candidate.adp_rank}` : 'Unranked'}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{marketRound}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className={`text-base font-bold ${candidate.eligibility_status === 'ineligible' ? 'text-red-300' : 'text-amber-200'}`}>
                        {candidate.eligibility_status === 'ineligible'
                          ? 'Ineligible'
                          : candidate.base_keeper_round
                            ? `Round ${candidate.base_keeper_round}`
                            : 'Review'}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-300">{keeperCostBasis(candidate)}</td>
                    <td className={`px-3 py-3 font-semibold ${VALUE_STYLES[candidate.value_rating]}`}>
                      {candidate.eligibility_status === 'ineligible'
                        ? 'N/A · Ineligible'
                        : candidate.value_rounds === null
                          ? 'Unrated'
                          : `${candidate.value_rounds > 0 ? '+' : ''}${candidate.value_rounds} ${Math.abs(candidate.value_rounds) === 1 ? 'round' : 'rounds'} · ${candidate.value_rating}`}
                    </td>
                    <td className="max-w-64 px-3 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[candidate.eligibility_status]}`}>
                        {candidate.eligibility_status === 'review' ? 'Review' : candidate.eligibility_status === 'eligible' ? 'Eligible' : 'Ineligible'}
                      </span>
                      <div className="mt-1 text-xs text-gray-500">{candidate.eligibility_reason}</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {candidates.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-gray-500">No players match these filters.</div>
        )}
      </div>
    </section>
  )
}

function DraftSimulator({ data }: { data: KeeperBoardData }) {
  const [assignments, setAssignments] = useState<KeeperAssignments>({})
  const [activeTeamKey, setActiveTeamKey] = useState('')
  const [draftOrder, setDraftOrder] = useState<string[]>([])

  const candidatesById = useMemo(
    () => new Map(data.candidates.map(candidate => [candidate.candidate_id, candidate])),
    [data.candidates],
  )
  const teamsByKey = useMemo(
    () => new Map(data.teams.map(team => [team.key, team])),
    [data.teams],
  )

  useEffect(() => {
    const keys = data.teams.map(team => team.key)
    setDraftOrder(current => current.length === keys.length ? current : keys)
    setActiveTeamKey(current => current && keys.includes(current) ? current : keys[0] ?? '')
  }, [data.teams])

  const activeTeam = teamsByKey.get(activeTeamKey) ?? null
  const activeSelections = assignments[activeTeamKey] ?? []
  const selectedByOtherTeams = useMemo(() => {
    const ids = new Set<string>()
    for (const [teamKey, keepers] of Object.entries(assignments)) {
      if (teamKey === activeTeamKey) continue
      for (const keeper of keepers) ids.add(keeper.candidateId)
    }
    return ids
  }, [activeTeamKey, assignments])

  const candidateOptions = useMemo(() => {
    if (!activeTeam) return []
    return data.candidates
      .filter(candidate => {
        if (selectedByOtherTeams.has(candidate.candidate_id)) return false
        return candidate.roster_team_key === activeTeam.key
      })
      .sort((a, b) => {
        const valueDiff = (b.value_rounds ?? -999) - (a.value_rounds ?? -999)
        return valueDiff || a.player_name.localeCompare(b.player_name)
      })
  }, [activeTeam, data.candidates, selectedByOtherTeams])

  const resolvedAssignments = useMemo<ResolvedAssignments>(() => {
    const resolved: ResolvedAssignments = {}
    for (const team of data.teams) {
      resolved[team.key] = resolveTeamKeepers(
        assignments[team.key] ?? [],
        data.rules.draft_rounds,
        Object.fromEntries(
          Object.entries(team.round_capacities).map(([round, capacity]) => [Number(round), capacity]),
        ),
      )
    }
    return resolved
  }, [assignments, data.rules.draft_rounds, data.teams])

  const activeResolved = resolvedAssignments[activeTeamKey] ?? []
  const projections = useMemo(
    () => simulateAdpDraft({
      draftOrder,
      focusTeamKey: activeTeamKey,
      assignments: resolvedAssignments,
      adpPlayers: data.adp_players,
      draftRounds: data.rules.draft_rounds,
    }),
    [activeTeamKey, data.adp_players, data.rules.draft_rounds, draftOrder, resolvedAssignments],
  )

  function setKeeperAtSlot(slot: number, candidateId: string) {
    setAssignments(current => {
      const next: KeeperAssignments = Object.fromEntries(
        Object.entries(current).map(([key, values]) => [key, [...values]]),
      )
      const teamSelections = [...(next[activeTeamKey] ?? [])]
      if (!candidateId) {
        teamSelections.splice(slot, 1)
        next[activeTeamKey] = teamSelections
        return next
      }

      const candidate = candidatesById.get(candidateId)
      if (!candidate) return current
      const duplicateIndex = teamSelections.findIndex(
        (selection, index) => selection.candidateId === candidateId && index !== slot,
      )
      if (duplicateIndex >= 0) teamSelections.splice(duplicateIndex, 1)
      teamSelections[slot] = toSelection(candidate)
      next[activeTeamKey] = teamSelections.filter(Boolean).slice(0, 3)
      return next
    })
  }

  function updateSelection(slot: number, changes: Partial<SimulatorKeeper>) {
    setAssignments(current => {
      const selections = [...(current[activeTeamKey] ?? [])]
      if (!selections[slot]) return current
      selections[slot] = { ...selections[slot], ...changes }
      if (changes.designatedDynasty) {
        selections.forEach((selection, index) => {
          if (index !== slot) selections[index] = { ...selection, designatedDynasty: false }
        })
      }
      return { ...current, [activeTeamKey]: selections }
    })
  }

  function moveActiveTeamToSlot(slot: number) {
    setDraftOrder(current => {
      const currentIndex = current.indexOf(activeTeamKey)
      const nextIndex = slot - 1
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      ;[next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]]
      return next
    })
  }

  return (
    <section aria-labelledby="draft-simulator-heading">
      <div className="mb-5">
        <h2 id="draft-simulator-heading" className="text-xl font-bold text-white">Draft Simulator</h2>
        <p className="mt-1 text-sm text-gray-400">
          Build a private {data.rules.league_size}-team keeper scenario, adjust the order, and run an ADP-chalk snake draft.
        </p>
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="block flex-1">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Active team</span>
              <select
                value={activeTeamKey}
                onChange={event => setActiveTeamKey(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-white"
              >
                {data.teams.map(team => (
                  <option key={team.key} value={team.key}>{team.name}</option>
                ))}
              </select>
            </label>
            <label className="block w-full sm:w-40">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Draft slot</span>
              <select
                value={Math.max(1, draftOrder.indexOf(activeTeamKey) + 1)}
                onChange={event => moveActiveTeamToSlot(Number(event.target.value))}
                className="h-10 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-white"
              >
                {data.teams.map((_, index) => <option key={index} value={index + 1}>Slot {index + 1}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setDraftOrder(current => shuffle(current))}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-purple-700/60 bg-purple-950/40 px-3 text-sm font-medium text-purple-200 hover:bg-purple-950/70"
            >
              <Dices size={16} aria-hidden="true" /> Randomize order
            </button>
          </div>

          <div className="space-y-3">
            {[0, 1, 2].map(slot => {
              const selection = activeSelections[slot]
              const candidate = selection ? candidatesById.get(selection.candidateId) : null
              const resolved = activeResolved.find(item => item.candidateId === selection?.candidateId)
              const isExistingDynasty = candidate?.is_dynasty === true
              const hasOtherExistingDynasty = activeSelections.some((otherSelection, otherIndex) => (
                otherIndex !== slot && candidatesById.get(otherSelection.candidateId)?.is_dynasty === true
              ))
              const canDesignateDynasty = Boolean(
                candidate
                  && !hasOtherExistingDynasty
                  && candidate.draft_round !== 1
                  && candidate.kept_previous_year !== true,
              )
              return (
                <div key={slot} className="rounded-xl border border-gray-800 bg-gray-950/70 p-3">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_150px] lg:items-end">
                    <label>
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Keeper {slot + 1}</span>
                      <select
                        aria-label={`${activeTeam?.name ?? 'Team'} keeper ${slot + 1}`}
                        value={selection?.candidateId ?? ''}
                        onChange={event => setKeeperAtSlot(slot, event.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-white"
                      >
                        <option value="">No keeper selected</option>
                        {candidateOptions.map(option => (
                          <option
                            key={option.candidate_id}
                            value={option.candidate_id}
                            disabled={option.eligibility_status === 'ineligible'}
                          >
                            {option.player_name} · {option.position} · {option.base_keeper_round ? `R${option.base_keeper_round}` : 'round review'}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Yahoo override</span>
                      <input
                        type="number"
                        min={1}
                        max={data.rules.draft_rounds}
                        disabled={!selection}
                        value={selection?.manualRound ?? ''}
                        onChange={event => updateSelection(slot, {
                          manualRound: event.target.value ? Number(event.target.value) : undefined,
                        })}
                        placeholder={selection?.baseRound ? `Starting R${selection.baseRound}` : 'Round'}
                        className="h-10 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 text-sm text-white disabled:opacity-40"
                      />
                    </label>
                    <label className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-sm ${selection && canDesignateDynasty ? 'border-amber-700/60 bg-amber-950/30 text-amber-200' : 'border-gray-800 text-gray-600'}`}>
                      <input
                        type="checkbox"
                        checked={isExistingDynasty || (selection?.designatedDynasty ?? false)}
                        disabled={!selection || isExistingDynasty || !canDesignateDynasty}
                        onChange={event => updateSelection(slot, { designatedDynasty: event.target.checked })}
                        className="accent-amber-500"
                      />
                      Dynasty keeper
                    </label>
                  </div>
                  {selection && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>{selection.position}{selection.nflTeam ? ` · ${selection.nflTeam}` : ''}</span>
                      <span>Starting: {selection.baseRound ? `Round ${selection.baseRound}` : 'review'}</span>
                      <span className={resolved?.finalRound ? 'font-medium text-white' : 'text-red-300'}>
                        Final: {resolved?.finalRound ? `Round ${resolved.finalRound}` : 'unresolved'}
                      </span>
                      {resolved?.adjustmentReason && <span className="text-amber-300">{resolved.adjustmentReason}</span>}
                      {candidate?.eligibility_status === 'review' && <span className="text-amber-300">History review required</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <aside className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">League assumptions</h3>
              <p className="text-xs text-gray-500">Session only · {Object.values(assignments).flat().length} keepers assigned</p>
            </div>
            <Users size={18} className="text-gray-500" aria-hidden="true" />
          </div>
          <div className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
            {draftOrder.map((teamKey, index) => {
              const team = teamsByKey.get(teamKey)
              const count = assignments[teamKey]?.length ?? 0
              return (
                <button
                  type="button"
                  key={teamKey}
                  onClick={() => setActiveTeamKey(teamKey)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    teamKey === activeTeamKey
                      ? 'border-amber-600/60 bg-amber-950/35 text-white'
                      : 'border-gray-800 bg-gray-950/60 text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <span className="w-5 text-center text-xs font-bold text-gray-600">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{team?.name ?? teamKey}</span>
                  <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">{count}/3</span>
                </button>
              )
            })}
          </div>

        </aside>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <div className="flex flex-col gap-2 border-b border-gray-800 bg-gray-950/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-white">{activeTeam?.name ?? 'Team'} expected draft</h3>
            <p className="text-xs text-gray-500">Every non-keeper selection follows the best remaining FantasyPros consensus ADP.</p>
          </div>
          {data.adp_snapshot && (
            <span className="text-xs text-gray-500">Snapshot #{data.adp_snapshot.id} · {data.adp_snapshot.player_count} players</span>
          )}
        </div>

        {data.adp_players.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500">Import a FantasyPros snapshot to generate draft-round targets.</div>
        ) : (
          <div className="grid gap-px bg-gray-800 sm:grid-cols-2 xl:grid-cols-4">
            {projections.map(projection => (
              <div key={projection.round} className="bg-gray-900 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-white">Round {projection.round}</span>
                  <span className="text-xs text-gray-500">Pick #{projection.overallPick}</span>
                </div>
                {projection.keeper ? (
                  <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Keeper slot</div>
                    <div className="mt-1 font-medium text-white">{projection.keeper.playerName}</div>
                    <div className="text-xs text-gray-500">{projection.keeper.position}{projection.keeper.nflTeam ? ` · ${projection.keeper.nflTeam}` : ''}</div>
                  </div>
                ) : projection.options.length > 0 ? (
                  <div>
                    <div className="mb-2 rounded-lg border border-emerald-800/50 bg-emerald-950/25 p-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">ADP-chalk pick</div>
                      <div className="mt-0.5 font-medium text-white">{projection.options[0].player_name}</div>
                      <div className="text-xs text-gray-500">#{projection.options[0].rank} · {projection.options[0].position}{projection.options[0].nfl_team ? ` · ${projection.options[0].nfl_team}` : ''}</div>
                    </div>
                    <div className="space-y-1 text-xs text-gray-400">
                      {projection.options.slice(1).map(player => (
                        <div key={player.rank} className="flex justify-between gap-2">
                          <span className="truncate">{player.player_name}</span>
                          <span className="shrink-0 text-gray-600">#{player.rank}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">No ADP players remain.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default function KeeperLab() {
  const [view, setView] = useState<'board' | 'simulator'>('board')
  const { data, loading, error } = useApi<KeeperBoardData>(['keeper-board'], () => keeperApi.board())

  return (
    <PageWrapper
      title="Keeper Lab"
      subtitle="Price the roster, test keeper combinations, and see what the draft may leave behind."
    >
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && (
        <>
          <RulesRecap data={data} />

          {data.data_warnings.length > 0 && (
            <div className="mb-5 space-y-2">
              {data.data_warnings.map(warning => (
                <div key={warning} className="flex gap-2 rounded-lg border border-amber-800/50 bg-amber-950/25 px-3 py-2 text-sm text-amber-100/75">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          <div className="no-scrollbar mb-6 overflow-x-auto border-b border-gray-800">
            <div className="flex min-w-max gap-1">
              <button
                type="button"
                onClick={() => setView('board')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${view === 'board' ? 'border-amber-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-200'}`}
              >
                <ShieldCheck size={15} aria-hidden="true" /> Keeper Board
              </button>
              <button
                type="button"
                onClick={() => setView('simulator')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${view === 'simulator' ? 'border-amber-400 text-white' : 'border-transparent text-gray-500 hover:text-gray-200'}`}
              >
                <Sparkles size={15} aria-hidden="true" /> Draft Simulator
              </button>
            </div>
          </div>

          {view === 'board' ? <KeeperBoard data={data} /> : <DraftSimulator data={data} />}
        </>
      )}
    </PageWrapper>
  )
}
