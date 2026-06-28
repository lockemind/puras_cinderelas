import { FD_WINNER_ADVANCES_TO } from './scoring'
import type { StageReached } from './types'

const FD_LOSER_STAGE: Partial<Record<string, StageReached>> = {
  LAST_32: 'r32',
  LAST_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  FINAL: 'final',
}

const WORLD_CUP_2026_GROUP_COUNT = 12
const FIXTURES_PER_GROUP = 6

export type ProgressFixtureRow = {
  stage: string
  group: string | null
  status: string
  home_team_id: string | null
  away_team_id: string | null
  home_score: number | null
  away_score: number | null
}

export type ComputedTeamProgress = {
  group_wins: number
  group_draws: number
  stage_reached: StageReached
  is_champion: boolean
}

type GroupStanding = {
  teamId: string
  points: number
  goalDifference: number
  goalsFor: number
}

function compareStandings(a: GroupStanding, b: GroupStanding) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor
  )
}

function getGroupStandings(fixtures: ProgressFixtureRow[]) {
  const standings = new Map<string, GroupStanding>()

  const ensure = (teamId: string) => {
    if (!standings.has(teamId)) {
      standings.set(teamId, {
        teamId,
        points: 0,
        goalDifference: 0,
        goalsFor: 0,
      })
    }
    return standings.get(teamId)!
  }

  for (const fixture of fixtures) {
    const homeId = fixture.home_team_id
    const awayId = fixture.away_team_id
    const homeScore = fixture.home_score
    const awayScore = fixture.away_score
    if (!homeId || !awayId || homeScore == null || awayScore == null) continue

    const home = ensure(homeId)
    const away = ensure(awayId)

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

function getQualifiedFromGroups(fixtures: ProgressFixtureRow[]) {
  const groupFixtures = fixtures.filter(fixture => fixture.stage === 'GROUP_STAGE')
  if (groupFixtures.length === 0) return new Set<string>()
  if (
    groupFixtures.some(
      fixture =>
        fixture.status !== 'FINISHED' ||
        fixture.home_score == null ||
        fixture.away_score == null,
    )
  ) {
    return new Set<string>()
  }

  const groups = Array.from(
    new Set(groupFixtures.map(fixture => fixture.group).filter((group): group is string => Boolean(group))),
  )
  if (groups.length < WORLD_CUP_2026_GROUP_COUNT) return new Set<string>()
  if (
    groups.some(
      group => groupFixtures.filter(fixture => fixture.group === group).length < FIXTURES_PER_GROUP,
    )
  ) {
    return new Set<string>()
  }

  const qualified = new Set<string>()
  const thirdPlaced: GroupStanding[] = []

  for (const group of groups) {
    const standings = getGroupStandings(groupFixtures.filter(fixture => fixture.group === group))
    for (const standing of standings.slice(0, 2)) qualified.add(standing.teamId)
    if (standings[2]) thirdPlaced.push(standings[2])
  }

  for (const standing of thirdPlaced.sort(compareStandings).slice(0, 8)) {
    qualified.add(standing.teamId)
  }

  return qualified
}

export function computeTeamStatsFromFixtures(fixtures: ProgressFixtureRow[]) {
  const stats = new Map<string, ComputedTeamProgress>()

  const ensure = (id: string) => {
    if (!stats.has(id)) {
      stats.set(id, {
        group_wins: 0,
        group_draws: 0,
        stage_reached: 'group_stage',
        is_champion: false,
      })
    }
    return stats.get(id)!
  }

  for (const fixture of fixtures) {
    const homeId = fixture.home_team_id
    const awayId = fixture.away_team_id
    const homeScore = fixture.home_score
    const awayScore = fixture.away_score
    if (fixture.status !== 'FINISHED' || homeScore == null || awayScore == null) continue

    if (fixture.stage === 'GROUP_STAGE') {
      if (homeId) ensure(homeId)
      if (awayId) ensure(awayId)

      if (homeScore > awayScore) {
        if (homeId) ensure(homeId).group_wins++
      } else if (awayScore > homeScore) {
        if (awayId) ensure(awayId).group_wins++
      } else {
        if (homeId) ensure(homeId).group_draws++
        if (awayId) ensure(awayId).group_draws++
      }
      continue
    }

    const loserStage = FD_LOSER_STAGE[fixture.stage]
    const winnerStage = FD_WINNER_ADVANCES_TO[fixture.stage]
    if (!loserStage || !winnerStage || homeScore === awayScore) continue

    const winnerId = homeScore > awayScore ? homeId : awayId
    const loserId = homeScore > awayScore ? awayId : homeId
    if (loserId) ensure(loserId).stage_reached = loserStage
    if (winnerId) {
      const winner = ensure(winnerId)
      winner.stage_reached = winnerStage
      winner.is_champion = winnerStage === 'champion'
    }
  }

  for (const teamId of getQualifiedFromGroups(fixtures)) {
    const progress = ensure(teamId)
    if (progress.stage_reached === 'group_stage') progress.stage_reached = 'r32'
  }

  return stats
}
