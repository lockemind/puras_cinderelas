import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlayerByToken } from '@/actions/players'
import { getFixtureDetail, getFixtureOwnership } from '@/actions/fixtures'
import { getCompetition } from '@/actions/competition'
import { MatchHeader } from '@/components/match-header'
import { MascotHero } from '@/components/mascot-hero'
import { OwnersList } from '@/components/owners-list'

export default async function FixtureDetailPage({
  params,
}: {
  params: Promise<{ token: string; fixtureId: string }>
}) {
  const { token, fixtureId } = await params

  const [player, fixture, competition] = await Promise.all([
    getPlayerByToken(token),
    getFixtureDetail(fixtureId),
    getCompetition(),
  ])

  if (!player) notFound()
  if (!fixture) notFound()

  const isLocked = ['locked', 'running', 'finished'].includes(competition.status)

  const ownership = isLocked
    ? await getFixtureOwnership(
        fixture.home_team?.id ?? null,
        fixture.away_team?.id ?? null,
      )
    : null

  const homeMascot = fixture.home_team?.mascot
    ? { slug: fixture.home_team.mascot, name: fixture.home_team.name }
    : null

  const awayMascot = fixture.away_team?.mascot
    ? { slug: fixture.away_team.mascot, name: fixture.away_team.name }
    : null

  return (
    <div className="py-4 space-y-4">
      <Link
        href={`/play/${token}/selections`}
        className="text-gold text-sm flex items-center gap-1 hover:text-gold-light transition-colors"
      >
        ← Jogos
      </Link>

      <MatchHeader fixture={fixture} />

      <MascotHero home={homeMascot} away={awayMascot} />

      {isLocked && ownership && (
        <OwnersList ownership={ownership} currentPlayerId={player.id} />
      )}
    </div>
  )
}
