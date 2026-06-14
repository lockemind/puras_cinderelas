import { describe, it, expect } from 'vitest'
import { getScoreBreakdown, calculateTeamScore, getWinWorth, mergeProgress } from '../scoring'
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

  it('+3 for reaching r32', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'r32' }), 3)
    expect(b.cinderelaBonusTotal).toBe(3)
  })

  it('+10 cumulative for reaching r16 (3+7)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'r16' }), 3)
    expect(b.cinderelaBonusTotal).toBe(10)
  })

  it('+20 cumulative for reaching qf (3+7+10)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'qf' }), 3)
    expect(b.cinderelaBonusTotal).toBe(20)
  })

  it('+35 cumulative for reaching sf (3+7+10+15)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'sf' }), 3)
    expect(b.cinderelaBonusTotal).toBe(35)
  })

  it('+55 cumulative for reaching final (3+7+10+15+20)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'final' }), 3)
    expect(b.cinderelaBonusTotal).toBe(55)
  })

  it('+80 cumulative for champion (3+7+10+15+20+25)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'champion', is_champion: true }), 3)
    expect(b.cinderelaBonusTotal).toBe(80)
  })
})

describe('cinderela bonus — pot 4', () => {
  it('no bonus for group_stage', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'group_stage' }), 4)
    expect(b.cinderelaBonusTotal).toBe(0)
  })

  it('+5 for reaching r32', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'r32' }), 4)
    expect(b.cinderelaBonusTotal).toBe(5)
  })

  it('+15 cumulative for reaching r16 (5+10)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'r16' }), 4)
    expect(b.cinderelaBonusTotal).toBe(15)
  })

  it('+30 cumulative for reaching qf (5+10+15)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'qf' }), 4)
    expect(b.cinderelaBonusTotal).toBe(30)
  })

  it('+50 cumulative for reaching sf (5+10+15+20)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'sf' }), 4)
    expect(b.cinderelaBonusTotal).toBe(50)
  })

  it('+75 cumulative for reaching final (5+10+15+20+25)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'final' }), 4)
    expect(b.cinderelaBonusTotal).toBe(75)
  })

  it('+105 cumulative for champion (5+10+15+20+25+30)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'champion', is_champion: true }), 4)
    expect(b.cinderelaBonusTotal).toBe(105)
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
    // cinderela sf = 3+7+10+15 = 35
    // total = 67
    const p = mkProgress({ group_wins: 2, group_draws: 1, stage_reached: 'sf' })
    expect(calculateTeamScore(p, 3)).toBe(67)
  })
})

describe('getWinWorth', () => {
  it('group stage win is worth 3 points, no bonus, any pot', () => {
    expect(getWinWorth('GROUP_STAGE', 1)).toEqual({ winPoints: 3, cinderelaBonus: 0 })
    expect(getWinWorth('GROUP_STAGE', 4)).toEqual({ winPoints: 3, cinderelaBonus: 0 })
  })

  it('knockout win points follow POINTS_FOR_WINNING_INTO', () => {
    expect(getWinWorth('LAST_32', 1).winPoints).toBe(5)
    expect(getWinWorth('LAST_16', 1).winPoints).toBe(8)
    expect(getWinWorth('QUARTER_FINALS', 1).winPoints).toBe(12)
    expect(getWinWorth('SEMI_FINALS', 1).winPoints).toBe(15)
    expect(getWinWorth('FINAL', 1).winPoints).toBe(25)
  })

  it('cinderela bonus is the milestone of the stage the winner advances into', () => {
    expect(getWinWorth('LAST_32', 3).cinderelaBonus).toBe(7)   // pot 3 reaches r16
    expect(getWinWorth('LAST_32', 4).cinderelaBonus).toBe(10)  // pot 4 reaches r16
    expect(getWinWorth('QUARTER_FINALS', 4).cinderelaBonus).toBe(20) // pot 4 reaches sf
    expect(getWinWorth('FINAL', 4).cinderelaBonus).toBe(30)    // pot 4 champion
  })

  it('pots 1 and 2 never get a bonus', () => {
    expect(getWinWorth('FINAL', 1).cinderelaBonus).toBe(0)
    expect(getWinWorth('SEMI_FINALS', 2).cinderelaBonus).toBe(0)
  })

  it('unknown stage is worth nothing', () => {
    expect(getWinWorth('THIRD_PLACE', 1)).toEqual({ winPoints: 0, cinderelaBonus: 0 })
  })
})

describe('mergeProgress', () => {
  const db = { group_wins: 1, group_draws: 0, stage_reached: 'group_stage' as const, is_champion: false }

  it('returns DB values when no live data', () => {
    expect(mergeProgress(db, undefined)).toEqual(db)
  })

  it('live overrides group_wins and group_draws', () => {
    const live = { group_wins: 3, group_draws: 2, stage_reached: 'group_stage' as const, is_champion: false }
    const result = mergeProgress(db, live)
    expect(result.group_wins).toBe(3)
    expect(result.group_draws).toBe(2)
  })

  it('live group_stage does NOT override a more advanced DB stage', () => {
    const dbAdvanced = { ...db, stage_reached: 'qf' as const }
    const live = { group_wins: 2, group_draws: 1, stage_reached: 'group_stage' as const, is_champion: false }
    expect(mergeProgress(dbAdvanced, live).stage_reached).toBe('qf')
  })

  it('live knockout stage DOES override DB group_stage', () => {
    const live = { group_wins: 2, group_draws: 1, stage_reached: 'r16' as const, is_champion: false }
    expect(mergeProgress(db, live).stage_reached).toBe('r16')
  })

  it('live is_champion overrides DB', () => {
    const live = { group_wins: 3, group_draws: 0, stage_reached: 'champion' as const, is_champion: true }
    expect(mergeProgress(db, live).is_champion).toBe(true)
  })
})
