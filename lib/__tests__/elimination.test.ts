import { describe, it, expect } from 'vitest'
import { isTeamEliminated } from '../elimination'
import type { Fixture, TeamProgress, StageReached } from '../types'

const T1 = 'team-1'
const OPP = 'team-x'

const mkProgress = (stage: StageReached, isChampion = false): TeamProgress => ({
  team_id: T1, group_wins: 0, group_draws: 0,
  stage_reached: stage, is_champion: isChampion, updated_at: '',
})

let n = 0
const mkFixture = (o: { stage: string; status: string; teamId?: string }): Fixture => ({
  id: `f${++n}`, api_id: n, stage: o.stage, group: null,
  utc_date: '2026-06-12T18:00:00Z', status: o.status,
  home_team: { id: o.teamId ?? T1, name: 'A', flag_emoji: '🏳️', mascot: null },
  away_team: { id: OPP, name: 'B', flag_emoji: '🏳️', mascot: null },
  home_score: null, away_score: null,
})

describe('isTeamEliminated', () => {
  it('alive mid-group-stage (only 2 of 3 games finished)', () => {
    const fixtures = [
      mkFixture({ stage: 'GROUP_STAGE', status: 'FINISHED' }),
      mkFixture({ stage: 'GROUP_STAGE', status: 'FINISHED' }),
      mkFixture({ stage: 'GROUP_STAGE', status: 'TIMED' }),
    ]
    expect(isTeamEliminated(T1, mkProgress('group_stage'), fixtures)).toBe(false)
  })

  it('eliminated in groups: 3 finished group games, still group_stage, nothing pending', () => {
    const fixtures = [1, 2, 3].map(() => mkFixture({ stage: 'GROUP_STAGE', status: 'FINISHED' }))
    expect(isTeamEliminated(T1, mkProgress('group_stage'), fixtures)).toBe(true)
  })

  it('alive when qualified: still group_stage but has a scheduled r32 fixture', () => {
    const fixtures = [
      ...[1, 2, 3].map(() => mkFixture({ stage: 'GROUP_STAGE', status: 'FINISHED' })),
      mkFixture({ stage: 'LAST_32', status: 'TIMED' }),
    ]
    expect(isTeamEliminated(T1, mkProgress('group_stage'), fixtures)).toBe(false)
  })

  it('eliminated in r32: stage_reached r32 and LAST_32 fixture finished', () => {
    const fixtures = [
      ...[1, 2, 3].map(() => mkFixture({ stage: 'GROUP_STAGE', status: 'FINISHED' })),
      mkFixture({ stage: 'LAST_32', status: 'FINISHED' }),
    ]
    expect(isTeamEliminated(T1, mkProgress('r32'), fixtures)).toBe(true)
  })

  it('alive after winning r32: stage_reached r16, r16 fixture not yet created', () => {
    const fixtures = [
      ...[1, 2, 3].map(() => mkFixture({ stage: 'GROUP_STAGE', status: 'FINISHED' })),
      mkFixture({ stage: 'LAST_32', status: 'FINISHED' }),
    ]
    expect(isTeamEliminated(T1, mkProgress('r16'), fixtures)).toBe(false)
  })

  it('champion is never eliminated', () => {
    expect(isTeamEliminated(T1, mkProgress('champion', true), [])).toBe(false)
  })

  it('ignores other teams fixtures', () => {
    const fixtures = [1, 2, 3].map(() =>
      mkFixture({ stage: 'GROUP_STAGE', status: 'FINISHED', teamId: 'someone-else' }))
    expect(isTeamEliminated(T1, mkProgress('group_stage'), fixtures)).toBe(false)
  })
})
