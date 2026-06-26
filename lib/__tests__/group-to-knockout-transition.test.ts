import { describe, expect, it } from 'vitest'
import { isTeamEliminated } from '../elimination'
import { compareRankingEntries, computeTeamGoalStats, sumGoalStats } from '../ranking'
import { getScoreBreakdown } from '../scoring'
import type { Fixture, StageReached, TeamProgress } from '../types'

let fixtureNo = 0

const mkTeam = (id: string) => ({
  id,
  name: id,
  flag_emoji: 'F',
  mascot: null,
})

const mkProgress = (
  teamId: string,
  stage: StageReached = 'group_stage',
  group_wins = 0,
  group_draws = 0,
): TeamProgress => ({
  team_id: teamId,
  group_wins,
  group_draws,
  stage_reached: stage,
  is_champion: stage === 'champion',
  updated_at: '',
})

const groupFixture = (
  group: string,
  homeId: string,
  awayId: string,
  homeScore: number | null,
  awayScore: number | null,
  status = 'FINISHED',
): Fixture => ({
  id: `fixture-${++fixtureNo}`,
  api_id: fixtureNo,
  stage: 'GROUP_STAGE',
  group,
  utc_date: '2026-06-26T18:00:00Z',
  status,
  home_team: mkTeam(homeId),
  away_team: mkTeam(awayId),
  home_score: homeScore,
  away_score: awayScore,
})

const knockoutFixture = (
  homeId: string,
  awayId: string,
  status = 'TIMED',
  homeScore: number | null = null,
  awayScore: number | null = null,
): Fixture => ({
  id: `fixture-${++fixtureNo}`,
  api_id: fixtureNo,
  stage: 'LAST_32',
  group: null,
  utc_date: '2026-07-01T18:00:00Z',
  status,
  home_team: mkTeam(homeId),
  away_team: mkTeam(awayId),
  home_score: homeScore,
  away_score: awayScore,
})

const settledGroup = (groupNo: number, thirdWinGoals: 1 | 2) => {
  const group = `GROUP_${String(groupNo).padStart(2, '0')}`
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(team => `g${groupNo}-${team}`)

  return [
    groupFixture(group, a, b, 2, 0),
    groupFixture(group, a, c, 1, 0),
    groupFixture(group, a, d, 2, 0),
    groupFixture(group, b, c, 1, 0),
    groupFixture(group, b, d, 2, 0),
    groupFixture(group, c, d, thirdWinGoals, 0),
  ]
}

const transitionSnapshot = () =>
  Array.from({ length: 12 }, (_, index) => {
    const groupNo = index + 1
    return settledGroup(groupNo, groupNo <= 8 ? 2 : 1)
  }).flat()

const recordFromFixtures = (teamId: string, fixtures: Fixture[]) => {
  let wins = 0
  let draws = 0

  for (const fixture of fixtures) {
    if (fixture.stage !== 'GROUP_STAGE') continue
    if (fixture.status !== 'FINISHED') continue
    if (fixture.home_score == null || fixture.away_score == null) continue

    const isHome = fixture.home_team?.id === teamId
    const isAway = fixture.away_team?.id === teamId
    if (!isHome && !isAway) continue

    const mine = isHome ? fixture.home_score : fixture.away_score
    const theirs = isHome ? fixture.away_score : fixture.home_score

    if (mine > theirs) wins++
    else if (mine === theirs) draws++
  }

  return { wins, draws }
}

const progressFromFixtures = (
  teamId: string,
  fixtures: Fixture[],
  stage: StageReached = 'group_stage',
) => {
  const record = recordFromFixtures(teamId, fixtures)
  return mkProgress(teamId, stage, record.wins, record.draws)
}

const rankPlayers = (
  fixtures: Fixture[],
  players: Array<{
    name: string
    teams: Array<{ id: string; pot: number; stage?: StageReached }>
  }>,
) => {
  const goalStatsByTeam = computeTeamGoalStats(
    fixtures
      .filter(fixture => fixture.status === 'FINISHED')
      .map(fixture => ({
        home_team_id: fixture.home_team?.id ?? null,
        away_team_id: fixture.away_team?.id ?? null,
        home_score: fixture.home_score,
        away_score: fixture.away_score,
      })),
  )

  return players
    .map(player => {
      const totalScore = player.teams.reduce((total, team) => {
        const progress = progressFromFixtures(team.id, fixtures, team.stage)
        return total + getScoreBreakdown(progress, team.pot).total
      }, 0)
      const playerGoalStats = sumGoalStats(player.teams.map(team => team.id), goalStatsByTeam)

      return {
        player: { name: player.name },
        totalScore,
        ...playerGoalStats,
      }
    })
    .sort(compareRankingEntries)
}

describe('group-to-knockout transition', () => {
  it('keeps a third-placed team alive while other groups still have pending fixtures', () => {
    const fixtures = [
      ...settledGroup(1, 1),
      ...settledGroup(2, 1).slice(0, 5),
      groupFixture('GROUP_02', 'g2-c', 'g2-d', null, null, 'TIMED'),
    ]

    expect(isTeamEliminated('g1-c', progressFromFixtures('g1-c', fixtures), fixtures)).toBe(false)
  })

  it('distinguishes top-two, best-third, worst-third, and fourth-place teams after groups settle', () => {
    const fixtures = transitionSnapshot()

    expect(isTeamEliminated('g1-a', progressFromFixtures('g1-a', fixtures), fixtures)).toBe(false)
    expect(isTeamEliminated('g1-b', progressFromFixtures('g1-b', fixtures), fixtures)).toBe(false)
    expect(isTeamEliminated('g8-c', progressFromFixtures('g8-c', fixtures), fixtures)).toBe(false)
    expect(isTeamEliminated('g9-c', progressFromFixtures('g9-c', fixtures), fixtures)).toBe(true)
    expect(isTeamEliminated('g1-d', progressFromFixtures('g1-d', fixtures), fixtures)).toBe(true)
  })

  it('keeps a qualified team alive when LAST_32 appears, then eliminates it after a LAST_32 loss', () => {
    const fixtures = transitionSnapshot()
    const scheduledR32 = [...fixtures, knockoutFixture('g8-c', 'g1-a')]
    const finishedR32 = [...fixtures, knockoutFixture('g8-c', 'g1-a', 'FINISHED', 0, 2)]

    expect(isTeamEliminated('g8-c', progressFromFixtures('g8-c', fixtures), fixtures)).toBe(false)
    expect(isTeamEliminated('g8-c', progressFromFixtures('g8-c', scheduledR32), scheduledR32)).toBe(false)
    expect(isTeamEliminated('g8-c', progressFromFixtures('g8-c', finishedR32, 'r32'), finishedR32)).toBe(true)
  })

  it('computes player ranking totals and UI-facing score breakdowns from transition data', () => {
    const fixtures = [...transitionSnapshot(), knockoutFixture('g8-c', 'g1-a', 'TIMED')]
    const rankings = rankPlayers(fixtures, [
      {
        name: 'Alice',
        teams: [
          { id: 'g1-a', pot: 1 },
          { id: 'g8-c', pot: 3, stage: 'r32' },
        ],
      },
      {
        name: 'Bob',
        teams: [
          { id: 'g1-b', pot: 2 },
          { id: 'g9-c', pot: 3 },
        ],
      },
    ])

    const cinderelaBreakdown = getScoreBreakdown(progressFromFixtures('g8-c', fixtures, 'r32'), 3)

    expect(rankings.map(entry => [entry.player.name, entry.totalScore])).toEqual([
      ['Alice', 15],
      ['Bob', 9],
    ])
    expect(cinderelaBreakdown).toMatchObject({
      groupStagePoints: 3,
      knockoutPoints: 0,
      cinderelaBonusTotal: 3,
      total: 6,
    })
    expect(cinderelaBreakdown.cinderelaBonusDetail.map(detail => detail.label)).toEqual([
      'Dezasseis-avos de final',
    ])
  })
})
