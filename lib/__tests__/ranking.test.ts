import { describe, expect, it } from 'vitest'
import {
  compareRankingEntries,
  computeTeamGoalStats,
  sumGoalStats,
  type RankingSortEntry,
} from '../ranking'

const entry = (overrides: Partial<RankingSortEntry>): RankingSortEntry => ({
  player: { name: 'Jogador' },
  totalScore: 10,
  goalsFor: 0,
  goalsAgainst: 0,
  ...overrides,
})

describe('computeTeamGoalStats', () => {
  it('aggregates goals scored and conceded for home and away teams', () => {
    const stats = computeTeamGoalStats([
      { home_team_id: 'por', away_team_id: 'bra', home_score: 2, away_score: 1 },
      { home_team_id: 'jpn', away_team_id: 'por', home_score: 0, away_score: 3 },
      { home_team_id: 'bra', away_team_id: 'jpn', home_score: null, away_score: null },
    ])

    expect(stats.get('por')).toEqual({ goalsFor: 5, goalsAgainst: 1 })
    expect(stats.get('bra')).toEqual({ goalsFor: 1, goalsAgainst: 2 })
    expect(stats.get('jpn')).toEqual({ goalsFor: 0, goalsAgainst: 3 })
  })

  it('sums aggregate goal stats across a player squad', () => {
    const stats = computeTeamGoalStats([
      { home_team_id: 'a', away_team_id: 'b', home_score: 2, away_score: 1 },
      { home_team_id: 'c', away_team_id: 'd', home_score: 0, away_score: 4 },
    ])

    expect(sumGoalStats(['a', 'd'], stats)).toEqual({ goalsFor: 6, goalsAgainst: 1 })
  })
})

describe('compareRankingEntries', () => {
  it('sorts first by total score descending', () => {
    const sorted = [entry({ totalScore: 8 }), entry({ totalScore: 11 })].sort(compareRankingEntries)

    expect(sorted.map(e => e.totalScore)).toEqual([11, 8])
  })

  it('breaks point ties by more aggregate goals scored', () => {
    const sorted = [
      entry({ player: { name: 'A' }, goalsFor: 4, goalsAgainst: 2 }),
      entry({ player: { name: 'B' }, goalsFor: 7, goalsAgainst: 5 }),
    ].sort(compareRankingEntries)

    expect(sorted[0].player.name).toBe('B')
  })

  it('then breaks ties by fewer aggregate goals conceded', () => {
    const sorted = [
      entry({ player: { name: 'A' }, goalsFor: 7, goalsAgainst: 4 }),
      entry({ player: { name: 'B' }, goalsFor: 7, goalsAgainst: 2 }),
    ].sort(compareRankingEntries)

    expect(sorted[0].player.name).toBe('B')
  })
})
