import type { Fixture, TeamProgress } from './types'

// football-data fixture stage → stage_reached value of the team that LOST at that stage
// (mirrors FD_STAGE_MAP in supabase/functions/sync-results/index.ts)
const FD_LOSER_STAGE: Record<string, string> = {
  LAST_32: 'r32',
  LAST_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  FINAL: 'final',
}

const SETTLED = ['FINISHED', 'CANCELLED']

export function isTeamEliminated(
  teamId: string,
  progress: TeamProgress,
  fixtures: Fixture[]
): boolean {
  if (progress.is_champion) return false

  const mine = fixtures.filter(
    f => f.home_team?.id === teamId || f.away_team?.id === teamId
  )
  if (mine.some(f => !SETTLED.includes(f.status))) return false

  if (progress.stage_reached === 'group_stage') {
    const finishedGroupGames = mine.filter(
      f => f.stage === 'GROUP_STAGE' && f.status === 'FINISHED'
    ).length
    return finishedGroupGames >= 3
  }

  return mine.some(
    f => f.status === 'FINISHED' && FD_LOSER_STAGE[f.stage] === progress.stage_reached
  )
}
