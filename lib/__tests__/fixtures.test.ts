import { describe, it, expect } from 'vitest'
import { groupFixturesByDate } from '../fixtures'
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
