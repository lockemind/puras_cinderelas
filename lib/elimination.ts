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

type GroupStanding = {
  teamId: string
  played: number
  points: number
  goalDifference: number
  goalsFor: number
}

function hasScore(fixture: Fixture) {
  return fixture.home_score != null && fixture.away_score != null
}

function compareStandings(a: GroupStanding, b: GroupStanding) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor
  )
}

function getGroupStandings(groupFixtures: Fixture[]) {
  const standings = new Map<string, GroupStanding>()

  const ensure = (teamId: string) => {
    if (!standings.has(teamId)) {
      standings.set(teamId, {
        teamId,
        played: 0,
        points: 0,
        goalDifference: 0,
        goalsFor: 0,
      })
    }
    return standings.get(teamId)!
  }

  for (const fixture of groupFixtures) {
    const homeId = fixture.home_team?.id
    const awayId = fixture.away_team?.id
    if (!homeId || !awayId || fixture.status !== 'FINISHED' || !hasScore(fixture)) continue

    const home = ensure(homeId)
    const away = ensure(awayId)
    const homeScore = fixture.home_score!
    const awayScore = fixture.away_score!

    home.played++
    away.played++
    home.goalsFor += homeScore
    away.goalsFor += awayScore
    home.goalDifference += homeScore - awayScore
    away.goalDifference += awayScore - homeScore

    if (homeScore > awayScore) home.points += 3
    else if (awayScore > homeScore) away.points += 3
    else {
      home.points++
      away.points++
    }
  }

  return Array.from(standings.values()).sort(compareStandings)
}

function isAllGroupStageFinished(fixtures: Fixture[]) {
  return fixtures
    .filter(f => f.stage === 'GROUP_STAGE')
    .every(f => SETTLED.includes(f.status))
}

function isEliminatedFromGroup(teamId: string, fixtures: Fixture[]) {
  const myGroup = fixtures.find(
    f => f.stage === 'GROUP_STAGE' && (f.home_team?.id === teamId || f.away_team?.id === teamId)
  )?.group
  if (!myGroup) return false

  const groupFixtures = fixtures.filter(f => f.stage === 'GROUP_STAGE' && f.group === myGroup)
  if (groupFixtures.some(f => !SETTLED.includes(f.status))) return false

  const standings = getGroupStandings(groupFixtures)
  const rank = standings.findIndex(s => s.teamId === teamId) + 1
  if (rank === 0) return false

  // 2026 World Cup: top two in each group advance automatically. Third-place
  // qualification depends on all groups, so stay conservative until then.
  if (rank <= 2) return false
  if (rank === 3 && !isAllGroupStageFinished(fixtures)) return false

  if (rank === 3) {
    const thirdPlacedTeams = Array.from(
      new Set(
        fixtures
          .filter(f => f.stage === 'GROUP_STAGE' && f.group)
          .map(f => f.group!)
      )
    )
      .map(group => getGroupStandings(fixtures.filter(f => f.stage === 'GROUP_STAGE' && f.group === group))[2])
      .filter((standing): standing is GroupStanding => Boolean(standing))
      .sort(compareStandings)

    return thirdPlacedTeams.findIndex(s => s.teamId === teamId) >= 8
  }

  return true
}

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
    return isEliminatedFromGroup(teamId, fixtures)
  }

  return mine.some(
    f => f.status === 'FINISHED' && FD_LOSER_STAGE[f.stage] === progress.stage_reached
  )
}
