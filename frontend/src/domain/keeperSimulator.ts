export interface SimulatorKeeper {
  candidateId: string
  playerName: string
  position: string
  nflTeam: string | null
  adpRank: number | null
  baseRound: number | null
  manualRound?: number
  designatedDynasty: boolean
}

export interface ResolvedKeeper extends SimulatorKeeper {
  finalRound: number | null
  adjustmentReason: string | null
}

export interface SimulatorAdpPlayer {
  rank: number
  player_name: string
  position: string | null
  nfl_team: string | null
  average_adp: number | null
  adp_round: number
}

export interface DraftProjection {
  round: number
  overallPick: number
  keeper: ResolvedKeeper | null
  options: SimulatorAdpPlayer[]
}

export type KeeperAssignments = Record<string, SimulatorKeeper[]>
export type ResolvedAssignments = Record<string, ResolvedKeeper[]>

export function resolveTeamKeepers(
  keepers: SimulatorKeeper[],
  draftRounds: number,
  roundCapacity: Record<number, number> = {},
): ResolvedKeeper[] {
  const used = new Map<number, number>()

  return keepers.map(keeper => {
    const requested = keeper.manualRound ?? keeper.baseRound
    if (requested === null || requested < 1 || requested > draftRounds) {
      return {
        ...keeper,
        finalRound: null,
        adjustmentReason: 'Enter a valid keeper round.',
      }
    }

    let finalRound: number | null = null
    for (let round = requested; round >= 1; round -= 1) {
      const capacity = roundCapacity[round] ?? 1
      if ((used.get(round) ?? 0) < capacity) {
        finalRound = round
        used.set(round, (used.get(round) ?? 0) + 1)
        break
      }
    }

    if (finalRound === null) {
      return {
        ...keeper,
        finalRound: null,
        adjustmentReason: 'No earlier draft pick is available for this keeper.',
      }
    }

    return {
      ...keeper,
      finalRound,
      adjustmentReason:
        finalRound === requested
          ? null
          : `Adjusted from round ${requested} because that round was already occupied.`,
    }
  })
}

function normalizeName(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b$/, '')
    .trim()
}

export function snakeOverallPick(round: number, slot: number, teamCount: number) {
  return round % 2 === 1
    ? (round - 1) * teamCount + slot
    : round * teamCount - slot + 1
}

export function simulateAdpDraft({
  draftOrder,
  focusTeamKey,
  assignments,
  adpPlayers,
  draftRounds,
}: {
  draftOrder: string[]
  focusTeamKey: string
  assignments: ResolvedAssignments
  adpPlayers: SimulatorAdpPlayer[]
  draftRounds: number
}): DraftProjection[] {
  if (!draftOrder.includes(focusTeamKey)) return []

  const removedRanks = new Set<number>()
  const removedNames = new Set<string>()
  for (const keepers of Object.values(assignments)) {
    for (const keeper of keepers) {
      if (keeper.adpRank !== null) removedRanks.add(keeper.adpRank)
      removedNames.add(normalizeName(keeper.playerName))
    }
  }

  const available = [...adpPlayers]
    .sort((a, b) => a.rank - b.rank)
    .filter(
      player =>
        !removedRanks.has(player.rank) && !removedNames.has(normalizeName(player.player_name)),
    )

  const projections: DraftProjection[] = []
  for (let round = 1; round <= draftRounds; round += 1) {
    const roundOrder = round % 2 === 1 ? draftOrder : [...draftOrder].reverse()
    for (let roundIndex = 0; roundIndex < roundOrder.length; roundIndex += 1) {
      const teamKey = roundOrder[roundIndex]
      const keeper =
        assignments[teamKey]?.find(candidate => candidate.finalRound === round) ?? null
      const overallPick = (round - 1) * draftOrder.length + roundIndex + 1

      if (teamKey === focusTeamKey) {
        projections.push({
          round,
          overallPick,
          keeper,
          options: keeper ? [] : available.slice(0, 6),
        })
      }

      if (!keeper && available.length > 0) {
        available.shift()
      }
    }
  }
  return projections
}

