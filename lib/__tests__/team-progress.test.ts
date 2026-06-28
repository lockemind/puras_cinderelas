import { describe, expect, it } from 'vitest'
import { getScoreBreakdown } from '../scoring'
import { computeTeamStatsFromFixtures, type ProgressFixtureRow } from '../team-progress'

const groupFixture = (
  group: string,
  homeId: string,
  awayId: string,
  homeScore: number | null,
  awayScore: number | null,
  status = 'FINISHED',
): ProgressFixtureRow => ({
  stage: 'GROUP_STAGE',
  group,
  status,
  home_team_id: homeId,
  away_team_id: awayId,
  home_score: homeScore,
  away_score: awayScore,
})

const knockoutFixture = (
  homeId: string,
  awayId: string,
  homeScore: number,
  awayScore: number,
): ProgressFixtureRow => ({
  stage: 'LAST_32',
  group: null,
  status: 'FINISHED',
  home_team_id: homeId,
  away_team_id: awayId,
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

const completedGroupStage = () =>
  Array.from({ length: 12 }, (_, index) => {
    const groupNo = index + 1
    return settledGroup(groupNo, groupNo <= 8 ? 2 : 1)
  }).flat()

describe('computeTeamStatsFromFixtures', () => {
  it('marks qualified teams as r32 when the group phase is complete', () => {
    const stats = computeTeamStatsFromFixtures(completedGroupStage())

    expect(stats.get('g1-a')?.stage_reached).toBe('r32')
    expect(stats.get('g1-b')?.stage_reached).toBe('r32')
    expect(stats.get('g8-c')?.stage_reached).toBe('r32')
    expect(stats.get('g9-c')?.stage_reached).toBe('group_stage')
    expect(stats.get('g1-d')?.stage_reached).toBe('group_stage')
  })

  it('gives the first cinderela bonus as soon as a pot 3 team reaches r32', () => {
    const progress = statsToProgress('g8-c', computeTeamStatsFromFixtures(completedGroupStage()))
    const breakdown = getScoreBreakdown(progress, 3)

    expect(breakdown).toMatchObject({
      groupStagePoints: 3,
      knockoutPoints: 0,
      cinderelaBonusTotal: 3,
      total: 6,
    })
  })

  it('does not infer r32 while any group fixture is still unfinished', () => {
    const fixtures = completedGroupStage()
    fixtures[0] = groupFixture('GROUP_01', 'g1-a', 'g1-b', null, null, 'TIMED')

    const stats = computeTeamStatsFromFixtures(fixtures)

    expect(stats.get('g1-a')?.stage_reached).toBe('group_stage')
    expect(stats.get('g8-c')?.stage_reached).toBe('group_stage')
  })

  it('preserves knockout progress over group qualification progress', () => {
    const stats = computeTeamStatsFromFixtures([
      ...completedGroupStage(),
      knockoutFixture('g8-c', 'g1-a', 0, 2),
    ])

    expect(stats.get('g8-c')?.stage_reached).toBe('r32')
    expect(stats.get('g1-a')?.stage_reached).toBe('r16')
  })
})

function statsToProgress(
  teamId: string,
  stats: ReturnType<typeof computeTeamStatsFromFixtures>,
) {
  const progress = stats.get(teamId)
  if (!progress) throw new Error(`Missing progress for ${teamId}`)

  return {
    team_id: teamId,
    ...progress,
    updated_at: '',
  }
}
