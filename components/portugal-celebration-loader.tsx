import { getFixtures } from '@/actions/fixtures'
import { getPortugalGameStatus } from '@/lib/portugal'
import { PortugalCelebration } from './portugal-celebration'

export async function PortugalCelebrationLoader() {
  const fixtures = await getFixtures()
  const { status, fixture } = getPortugalGameStatus(fixtures)

  if (status === 'none') return null

  const isHome = fixture?.home_team?.name === 'Portugal'

  return (
    <PortugalCelebration
      status={status}
      utcDate={fixture?.utc_date ?? null}
      homeScore={fixture?.home_score ?? null}
      awayScore={fixture?.away_score ?? null}
      homeTeamName={isHome ? fixture?.home_team?.name ?? null : fixture?.away_team?.name ?? null}
    />
  )
}
