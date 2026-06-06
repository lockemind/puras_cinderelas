import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlayerByToken } from '@/actions/players'
import { getPlayerTeams } from '@/actions/draft'
import { getFixtures } from '@/actions/fixtures'
import { groupFixturesByDate, toDisplayTime } from '@/lib/fixtures'

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Fase de Grupos',
  LAST_32: '1/16 de Final',
  LAST_16: '1/8 de Final',
  QUARTER_FINALS: 'Quartos de Final',
  SEMI_FINALS: 'Meia-Final',
  FINAL: 'Final',
}

const STATUS_DISPLAY: Record<string, string> = {
  FINISHED: 'FT',
  IN_PLAY: 'AO VIVO',
  PAUSED: 'INT',
  LIVE: 'AO VIVO',
  POSTPONED: 'ADI',
  CANCELLED: 'CANC',
}

export default async function JogosPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const player = await getPlayerByToken(token)
  if (!player) notFound()

  const [fixtures, myTeams] = await Promise.all([
    getFixtures(),
    getPlayerTeams(player.id),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myTeamIds = new Set((myTeams ?? []).map(pt => (pt.teams as any)?.id).filter(Boolean))

  if (fixtures.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Ainda não há jogos disponíveis. O administrador pode sincronizá-los no painel admin.
      </div>
    )
  }

  const groups = groupFixturesByDate(fixtures)

  return (
    <div className="py-4 space-y-6">
      {groups.map(group => (
        <div key={group.dateKey}>
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.fixtures.map(fixture => {
              const isMyGame =
                (fixture.home_team && myTeamIds.has(fixture.home_team.id)) ||
                (fixture.away_team && myTeamIds.has(fixture.away_team.id))
              const isFinished = fixture.status === 'FINISHED'
              const isLive = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(fixture.status)

              return (
                <Link
                  key={fixture.id}
                  href={`/play/${token}/selections/${fixture.id}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded border text-sm active:opacity-70 transition-opacity ${
                    isMyGame
                      ? 'border-gold/40 bg-gold-muted'
                      : 'border-night-border bg-night-card'
                  }`}
                >
                  <span className="text-base w-6 text-center">
                    {fixture.home_team?.flag_emoji ?? '?'}
                  </span>
                  <span className="text-foreground flex-1 truncate">
                    {fixture.home_team?.name ?? '—'}
                  </span>
                  <span className="tabular-nums text-xs font-mono text-center w-14">
                    {isFinished
                      ? `${fixture.home_score ?? '?'} – ${fixture.away_score ?? '?'}`
                      : isLive
                      ? STATUS_DISPLAY[fixture.status]
                      : STATUS_DISPLAY[fixture.status] ?? toDisplayTime(fixture.utc_date)}
                  </span>
                  <span className="text-foreground flex-1 truncate text-right">
                    {fixture.away_team?.name ?? '—'}
                  </span>
                  <span className="text-base w-6 text-center">
                    {fixture.away_team?.flag_emoji ?? '?'}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
