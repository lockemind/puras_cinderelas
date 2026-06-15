import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlayerByToken } from '@/actions/players'
import { getFixtureDetail, getFixtureOwnershipByTeam } from '@/actions/fixtures'
import { getPlayerTeams } from '@/actions/draft'
import { getCompetition } from '@/actions/competition'
import { getWinWorth } from '@/lib/scoring'
import { LIVE_STATUSES } from '@/lib/fixtures'
import { DuelHero } from '@/components/duel-hero'
import { WinWorthBanner } from '@/components/win-worth-banner'
import { OwnershipColumns } from '@/components/ownership-columns'

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Fase de Grupos',
  LAST_32: '1/16 de Final',
  LAST_16: 'Oitavos de Final',
  QUARTER_FINALS: 'Quartos de Final',
  SEMI_FINALS: 'Meia-Final',
  FINAL: 'Final',
}

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

  const [ownership, myTeams] = await Promise.all([
    isLocked
      ? getFixtureOwnershipByTeam(
          fixture.home_team?.id ?? null,
          fixture.away_team?.id ?? null,
          player.id,
        )
      : Promise.resolve(null),
    getPlayerTeams(player.id),
  ])

  const myTeamIds = new Set(
    (myTeams ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(pt => (pt.teams as any)?.id as string)
      .filter(Boolean),
  )
  const myTeamPots = new Map<string, number>(
    (myTeams ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(pt => [(pt.teams as any)?.id as string, pt.pot] as [string, number])
      .filter(([id]) => Boolean(id)),
  )

  const homeIsMine = fixture.home_team != null && myTeamIds.has(fixture.home_team.id)
  const awayIsMine = fixture.away_team != null && myTeamIds.has(fixture.away_team.id)

  const isLive = LIVE_STATUSES.includes(fixture.status)
  const isFinished = fixture.status === 'FINISHED'
  const status: 'upcoming' | 'live' | 'finished' = isFinished
    ? 'finished'
    : isLive
    ? 'live'
    : 'upcoming'

  let winner: 'home' | 'away' | 'draw' | null = null
  if (isFinished && fixture.home_score != null && fixture.away_score != null) {
    if (fixture.home_score > fixture.away_score) winner = 'home'
    else if (fixture.away_score > fixture.home_score) winner = 'away'
    else winner = 'draw'
  }

  const playerTeamSide: 'home' | 'away' | 'both' | null =
    homeIsMine && awayIsMine ? 'both' : homeIsMine ? 'home' : awayIsMine ? 'away' : null

  const mySidePot = homeIsMine
    ? myTeamPots.get(fixture.home_team!.id) ?? 1
    : awayIsMine
    ? myTeamPots.get(fixture.away_team!.id) ?? 1
    : 1
  const worth = getWinWorth(fixture.stage, mySidePot)

  const playerTeamWon =
    isFinished &&
    ((winner === 'home' && homeIsMine) || (winner === 'away' && awayIsMine))

  const stageLabel = STAGE_LABELS[fixture.stage] ?? fixture.stage

  return (
    <div className="py-4 space-y-3.5">
      <div className="flex items-center justify-between">
        <Link
          href={`/play/${token}/selections`}
          className="text-gold text-[13px] font-semibold flex items-center gap-[5px] hover:text-gold-light transition-colors"
        >
          ‹ Jogos
        </Link>
        <span className="text-muted-foreground text-[10px] tracking-[2px] uppercase font-bold">
          {stageLabel}
        </span>
      </div>

      <DuelHero
        home={{
          name: fixture.home_team?.name ?? '—',
          mascot: fixture.home_team?.mascot ?? null,
          flagEmoji: fixture.home_team?.flag_emoji ?? '🏳️',
          isPlayerTeam: homeIsMine,
        }}
        away={{
          name: fixture.away_team?.name ?? '—',
          mascot: fixture.away_team?.mascot ?? null,
          flagEmoji: fixture.away_team?.flag_emoji ?? '🏳️',
          isPlayerTeam: awayIsMine,
        }}
        status={status}
        utcDate={fixture.utc_date}
        homeScore={fixture.home_score}
        awayScore={fixture.away_score}
        stageLabel={stageLabel}
        winner={winner}
      />

      {(homeIsMine || awayIsMine) && (
        <WinWorthBanner
          status={status}
          winPoints={worth.winPoints}
          cinderelaBonus={worth.cinderelaBonus}
          playerTeamWon={playerTeamWon}
        />
      )}

      {isLocked && ownership && (
        <OwnershipColumns
          home={ownership.home}
          away={ownership.away}
          playerTeamSide={playerTeamSide}
        />
      )}
    </div>
  )
}
