import { describe, it, expect } from 'vitest'
import { shuffleAndAssign } from '../draw-utils'

describe('shuffleAndAssign', () => {
  it('returns one assignment per player', () => {
    const players = ['p1', 'p2', 'p3']
    const teams = ['t1', 't2', 't3']
    const result = shuffleAndAssign(players, teams)
    expect(result).toHaveLength(3)
  })

  it('uses each player exactly once', () => {
    const players = ['p1', 'p2', 'p3', 'p4']
    const teams = ['t1', 't2', 't3', 't4']
    const result = shuffleAndAssign(players, teams)
    const playerIds = result.map(r => r.playerId)
    expect(new Set(playerIds).size).toBe(4)
    expect(playerIds.sort()).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('uses each team exactly once', () => {
    const players = ['p1', 'p2', 'p3', 'p4']
    const teams = ['t1', 't2', 't3', 't4']
    const result = shuffleAndAssign(players, teams)
    const teamIds = result.map(r => r.teamId)
    expect(new Set(teamIds).size).toBe(4)
    expect(teamIds.sort()).toEqual(['t1', 't2', 't3', 't4'])
  })

  it('throws when arrays have different lengths', () => {
    expect(() => shuffleAndAssign(['p1', 'p2'], ['t1'])).toThrow(
      'Players and teams arrays must have equal length'
    )
  })
})
