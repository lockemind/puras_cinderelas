import type { Fixture } from './types'
import { LIVE_STATUSES } from './fixtures'

const PORTUGAL_NAME = 'Portugal'

export type PortugalGameStatus =
  | 'none'
  | 'today'
  | 'soon'
  | 'live'
  | 'finished_today'

export function getPortugalGameStatus(
  fixtures: Fixture[],
  now: Date = new Date(),
): { status: PortugalGameStatus; fixture: Fixture | null } {
  const ptFixtures = fixtures.filter(
    f =>
      f.home_team?.name === PORTUGAL_NAME ||
      f.away_team?.name === PORTUGAL_NAME,
  )

  const live = ptFixtures.find(f => LIVE_STATUSES.includes(f.status))
  if (live) return { status: 'live', fixture: live }

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const finishedToday = ptFixtures.find(f => {
    const d = new Date(f.utc_date)
    return f.status === 'FINISHED' && d >= todayStart && d <= todayEnd
  })
  if (finishedToday) return { status: 'finished_today', fixture: finishedToday }

  const upcoming = ptFixtures
    .filter(f => f.status === 'SCHEDULED' || f.status === 'TIMED')
    .sort((a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime())

  const next = upcoming[0]
  if (!next) return { status: 'none', fixture: null }

  const kickoff = new Date(next.utc_date).getTime()
  const diffMs = kickoff - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours <= 3 && diffHours > 0) return { status: 'soon', fixture: next }

  const gameDate = new Date(next.utc_date)
  if (
    gameDate >= todayStart &&
    gameDate <= todayEnd
  ) {
    return { status: 'today', fixture: next }
  }

  return { status: 'none', fixture: null }
}

export function isPortugalFixture(fixture: Fixture): boolean {
  return (
    fixture.home_team?.name === PORTUGAL_NAME ||
    fixture.away_team?.name === PORTUGAL_NAME
  )
}
