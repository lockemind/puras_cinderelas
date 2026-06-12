import type { Fixture } from './types'

const LISBON_TZ = 'Europe/Lisbon'

export function toDateKey(utcDate: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: LISBON_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(utcDate))
}

export function toDisplayTime(utcDate: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: LISBON_TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(utcDate))
}

export function toDisplayDate(utcDate: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: LISBON_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(utcDate))
}

export type FixtureGroup = {
  label: string
  dateKey: string
  fixtures: Fixture[]
}

export function groupFixturesByDate(fixtures: Fixture[]): FixtureGroup[] {
  const sorted = [...fixtures].sort(
    (a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime()
  )

  const map = new Map<string, FixtureGroup>()

  for (const fixture of sorted) {
    const key = toDateKey(fixture.utc_date)
    if (!map.has(key)) {
      map.set(key, {
        label: toDisplayDate(fixture.utc_date),
        dateKey: key,
        fixtures: [],
      })
    }
    map.get(key)!.fixtures.push(fixture)
  }

  return Array.from(map.values())
}

export const LIVE_STATUSES = ['IN_PLAY', 'PAUSED', 'LIVE']

const SETTLED_STATUSES = ['FINISHED', 'CANCELLED', 'POSTPONED']

export type PlayerFixtures = {
  hero: Fixture | null
  myToday: Fixture[]
  othersToday: Fixture[]
}

export function splitFixturesForPlayer(
  fixtures: Fixture[],
  myTeamIds: Set<string>,
  now: Date = new Date()
): PlayerFixtures {
  const isMine = (f: Fixture) =>
    (f.home_team != null && myTeamIds.has(f.home_team.id)) ||
    (f.away_team != null && myTeamIds.has(f.away_team.id))

  const sorted = [...fixtures].sort(
    (a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime()
  )

  const hero =
    sorted.find(f => isMine(f) && !SETTLED_STATUSES.includes(f.status)) ?? null

  const todayKey = toDateKey(now.toISOString())
  const today = sorted.filter(f => toDateKey(f.utc_date) === todayKey)

  return {
    hero,
    myToday: today.filter(f => isMine(f) && f.id !== hero?.id),
    othersToday: today.filter(f => !isMine(f)),
  }
}
