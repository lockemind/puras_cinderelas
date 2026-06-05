import { describe, it, expect } from 'vitest'
import { getScoreBreakdown, calculateTeamScore } from '../scoring'
import type { TeamProgress } from '../types'

const mkProgress = (overrides: Partial<TeamProgress>): TeamProgress => ({
  team_id: 'test',
  group_wins: 0,
  group_draws: 0,
  stage_reached: 'group_stage',
  is_champion: false,
  updated_at: '',
  ...overrides,
})

describe('group stage scoring', () => {
  it('scores 3 points per win', () => {
    const p = mkProgress({ group_wins: 2 })
    expect(calculateTeamScore(p, 1)).toBe(6)
  })

  it('scores 1 point per draw', () => {
    const p = mkProgress({ group_draws: 3 })
    expect(calculateTeamScore(p, 1)).toBe(3)
  })

  it('combines wins and draws', () => {
    const p = mkProgress({ group_wins: 2, group_draws: 1 })
    expect(calculateTeamScore(p, 1)).toBe(7)
  })
})

describe('knockout stage points', () => {
  it('0 points for group_stage', () => {
    const b = getScoreBreakdown(mkProgress({ group_wins: 1, stage_reached: 'group_stage' }), 1)
    expect(b.knockoutPoints).toBe(0)
  })

  it('0 knockout points for r32 (lost in r32, no knockout wins)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'r32' }), 1)
    expect(b.knockoutPoints).toBe(0)
  })

  it('+5 for r16 (won r32)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'r16' }), 1)
    expect(b.knockoutPoints).toBe(5)
  })

  it('+13 for qf (won r32+r16)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'qf' }), 1)
    expect(b.knockoutPoints).toBe(13)
  })

  it('+25 for sf (won r32+r16+qf)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'sf' }), 1)
    expect(b.knockoutPoints).toBe(25)
  })

  it('+40 for final (won r32+r16+qf+sf)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'final' }), 1)
    expect(b.knockoutPoints).toBe(40)
  })

  it('+65 for champion (won everything)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'champion', is_champion: true }), 1)
    expect(b.knockoutPoints).toBe(65)
  })
})

describe('cinderela bonus — pot 3', () => {
  it('no bonus for group_stage', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'group_stage' }), 3)
    expect(b.cinderelaBonusTotal).toBe(0)
  })

  it('+3 for reaching qf', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'qf' }), 3)
    expect(b.cinderelaBonusTotal).toBe(3)
  })

  it('+10 cumulative for reaching sf (3+7)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'sf' }), 3)
    expect(b.cinderelaBonusTotal).toBe(10)
  })

  it('+20 cumulative for reaching final (3+7+10)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'final' }), 3)
    expect(b.cinderelaBonusTotal).toBe(20)
  })

  it('+35 cumulative for champion (3+7+10+15)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'champion', is_champion: true }), 3)
    expect(b.cinderelaBonusTotal).toBe(35)
  })
})

describe('cinderela bonus — pot 4', () => {
  it('+5 for reaching qf', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'qf' }), 4)
    expect(b.cinderelaBonusTotal).toBe(5)
  })

  it('+50 cumulative for champion (5+10+15+20)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'champion', is_champion: true }), 4)
    expect(b.cinderelaBonusTotal).toBe(50)
  })
})

describe('no cinderela bonus for pots 1 and 2', () => {
  it('pot 1 gets 0 bonus even at champion', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'champion', is_champion: true }), 1)
    expect(b.cinderelaBonusTotal).toBe(0)
  })

  it('pot 2 gets 0 bonus even at champion', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'champion', is_champion: true }), 2)
    expect(b.cinderelaBonusTotal).toBe(0)
  })
})

describe('full score calculation', () => {
  it('calculates total correctly for a pot 3 team at sf', () => {
    // 2 wins + 1 draw in groups = 7
    // sf knockout = 25
    // cinderela sf = +10
    // total = 42
    const p = mkProgress({ group_wins: 2, group_draws: 1, stage_reached: 'sf' })
    expect(calculateTeamScore(p, 3)).toBe(42)
  })
})
