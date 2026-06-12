import { describe, it, expect } from 'vitest'
import { groupFixturesByDate, splitFixturesForPlayer } from '../fixtures'
import type { Fixture } from '../types'

const mkFixture = (overrides: Partial<Fixture> & { utc_date: string }): Fixture => ({
  id: 'f1',
  api_id: 1,
  stage: 'GROUP_STAGE',
  group: 'Group A',
  status: 'SCHEDULED',
  home_team: { id: 't1', name: 'Portugal', flag_emoji: '🇵🇹', mascot: null },
  away_team: { id: 't2', name: 'Spain', flag_emoji: '🇪🇸', mascot: null },
  home_score: null,
  away_score: null,
  ...overrides,
})

describe('groupFixturesByDate', () => {
  it('groups fixtures by Lisbon date', () => {
    const fixtures = [
      mkFixture({ id: 'f1', utc_date: '2026-06-12T19:00:00Z' }), // 20:00 Lisbon
      mkFixture({ id: 'f2', utc_date: '2026-06-12T21:00:00Z' }), // 22:00 Lisbon — same date
      mkFixture({ id: 'f3', utc_date: '2026-06-13T16:00:00Z' }), // 17:00 Lisbon — next date
    ]
    const groups = groupFixturesByDate(fixtures)
    expect(groups).toHaveLength(2)
    expect(groups[0].fixtures).toHaveLength(2)
    expect(groups[1].fixtures).toHaveLength(1)
  })

  it('returns groups ordered chronologically', () => {
    const fixtures = [
      mkFixture({ id: 'f1', utc_date: '2026-06-13T16:00:00Z' }),
      mkFixture({ id: 'f2', utc_date: '2026-06-12T19:00:00Z' }),
    ]
    const groups = groupFixturesByDate(fixtures)
    expect(new Date(groups[0].fixtures[0].utc_date) < new Date(groups[1].fixtures[0].utc_date)).toBe(true)
  })

  it('returns empty array for no fixtures', () => {
    expect(groupFixturesByDate([])).toEqual([])
  })

  it('includes a human-readable label for each group', () => {
    const fixtures = [mkFixture({ utc_date: '2026-06-12T19:00:00Z' })]
    const groups = groupFixturesByDate(fixtures)
    expect(typeof groups[0].label).toBe('string')
    expect(groups[0].label.length).toBeGreaterThan(0)
  })
})

describe('splitFixturesForPlayer', () => {
  const MY = 't-mine'
  const now = new Date('2026-06-12T15:00:00Z')
  const mine = (utc: string, status = 'TIMED', id = `m-${utc}-${status}`) =>
    mkFixture({
      id,
      utc_date: utc,
      status,
      home_team: { id: MY, name: 'Mine', flag_emoji: '🏳️', mascot: null },
    })
  const other = (utc: string, status = 'TIMED', id = `o-${utc}-${status}`) =>
    mkFixture({ id, utc_date: utc, status })

  it('hero is my live fixture when one is live', () => {
    const live = mine('2026-06-12T14:00:00Z', 'IN_PLAY')
    const upcoming = mine('2026-06-12T20:00:00Z')
    const { hero } = splitFixturesForPlayer([upcoming, live], new Set([MY]), now)
    expect(hero?.id).toBe(live.id)
  })

  it('hero is my soonest upcoming fixture otherwise, even on a later day', () => {
    const past = mine('2026-06-11T20:00:00Z', 'FINISHED')
    const next = mine('2026-06-14T18:00:00Z')
    const { hero } = splitFixturesForPlayer([next, past], new Set([MY]), now)
    expect(hero?.id).toBe(next.id)
  })

  it("myToday lists today's games with my teams, excluding the hero", () => {
    const heroFixture = mine('2026-06-12T16:00:00Z')
    const laterToday = mine('2026-06-12T20:00:00Z')
    const { myToday } = splitFixturesForPlayer([heroFixture, laterToday], new Set([MY]), now)
    expect(myToday.map(f => f.id)).toEqual([laterToday.id])
  })

  it("othersToday lists today's games not involving my teams, in kickoff order", () => {
    const a = other('2026-06-12T18:00:00Z')
    const b = other('2026-06-12T13:00:00Z', 'FINISHED')
    const tomorrow = other('2026-06-13T18:00:00Z')
    const { othersToday } = splitFixturesForPlayer([a, b, tomorrow], new Set([MY]), now)
    expect(othersToday.map(f => f.id)).toEqual([b.id, a.id])
  })

  it('hero is null when I have no remaining fixtures', () => {
    const done = mine('2026-06-11T20:00:00Z', 'FINISHED')
    const { hero } = splitFixturesForPlayer([done], new Set([MY]), now)
    expect(hero).toBeNull()
  })
})
