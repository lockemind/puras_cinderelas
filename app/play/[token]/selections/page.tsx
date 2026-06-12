import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlayerByToken } from '@/actions/players'
import { getPlayerTeams } from '@/actions/draft'
import { getFixtures } from '@/actions/fixtures'
import {
  groupFixturesByDate,
  splitFixturesForPlayer,
  toDisplayTime,
  LIVE_STATUSES,
} from '@/lib/fixtures'
import { getWinWorth } from '@/lib/scoring'
import { MascotAvatar } from '@/components/mascot-avatar'
import { NextMatchHero } from '@/components/next-match-hero'
import { LiveMinute } from '@/components/live-minute'
import type { Fixture } from '@/lib/types'

const FD_STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Grupos',
  LAST_32: '1/16',
  LAST_16: '1/8',
  QUARTER_FINALS: 'Quartos',
  SEMI_FINALS: 'Meias',
  FINAL: 'Final',
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

  const myTeamPots = new Map<string, number>(
    (myTeams ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(pt => [(pt.teams as any)?.id as string, pt.pot] as [string, number])
      .filter(([id]) => Boolean(id))
  )
  const myTeamIds = new Set(myTeamPots.keys())

  if (fixtures.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Ainda não há jogos disponíveis. O administrador pode sincronizá-los no painel admin.
      </div>
    )
  }

  const { hero, myToday, othersToday } = splitFixturesForPlayer(fixtures, myTeamIds)

  // Hero teams: my side vs opponent (if both sides are mine, lead with the higher pot — bigger bonus)
  let heroProps = null
  if (hero && hero.home_team && hero.away_team) {
    const homeIsMine = myTeamIds.has(hero.home_team.id)
    const awayIsMine = myTeamIds.has(hero.away_team.id)
    const mySide =
      homeIsMine && awayIsMine
        ? myTeamPots.get(hero.home_team.id)! >= myTeamPots.get(hero.away_team.id)!
          ? hero.home_team
          : hero.away_team
        : homeIsMine
        ? hero.home_team
        : hero.away_team
    const oppSide = mySide === hero.home_team ? hero.away_team : hero.home_team
    const worth = getWinWorth(hero.stage, myTeamPots.get(mySide.id) ?? 1)
    heroProps = { fixture: hero, mySide, oppSide, worth }
  }

  const isLive = (f: Fixture) => LIVE_STATUSES.includes(f.status)
  const myTeamIn = (f: Fixture) =>
    f.home_team && myTeamIds.has(f.home_team.id) ? f.home_team : f.away_team

  return (
    <div className="py-4 space-y-5">
      {heroProps && (
        <NextMatchHero
          href={`/play/${token}/selections/${heroProps.fixture.id}`}
          myTeam={{
            name: heroProps.mySide.name,
            mascot: heroProps.mySide.mascot ?? null,
            flagEmoji: heroProps.mySide.flag_emoji,
          }}
          opponent={{
            name: heroProps.oppSide.name,
            mascot: heroProps.oppSide.mascot ?? null,
            flagEmoji: heroProps.oppSide.flag_emoji,
          }}
          utcDate={heroProps.fixture.utc_date}
          isLive={isLive(heroProps.fixture)}
          stageLabel={FD_STAGE_LABELS[heroProps.fixture.stage] ?? heroProps.fixture.stage}
          kickoffTime={toDisplayTime(heroProps.fixture.utc_date)}
          winPoints={heroProps.worth.winPoints}
          cinderelaBonus={heroProps.worth.cinderelaBonus}
        />
      )}

      {myToday.length > 0 && (
        <section className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground">
            Em campo hoje · {myToday.length} {myToday.length === 1 ? 'equipa tua' : 'equipas tuas'}
          </p>
          {myToday.map(f => {
            const mine = myTeamIn(f)
            const live = isLive(f)
            return (
              <Link
                key={f.id}
                href={`/play/${token}/selections/${f.id}`}
                className={`flex items-center gap-2.5 rounded-xl border-[1.5px] px-3.5 py-2.5 active:opacity-70 ${
                  live ? 'border-destructive/45 bg-destructive/8' : 'border-gold/40 bg-gold/8'
                }`}
              >
                <MascotAvatar
                  mascot={mine?.mascot ?? null}
                  alt={mine?.name ?? ''}
                  size={34}
                  fallbackEmoji={mine?.flag_emoji}
                />
                <span className="flex-1 text-sm text-foreground truncate">
                  <strong>{f.home_team?.name}</strong>
                  {live || f.status === 'FINISHED'
                    ? ` ${f.home_score ?? 0}–${f.away_score ?? 0} `
                    : ' vs '}
                  {f.away_team?.name}
                </span>
                {live ? (
                  <LiveMinute utcDate={f.utc_date} />
                ) : f.status === 'FINISHED' ? (
                  <span className="text-[11px] font-semibold text-muted-foreground">FT</span>
                ) : (
                  <span className="text-[13px] font-semibold text-muted-foreground tabular-nums">
                    {toDisplayTime(f.utc_date)}
                  </span>
                )}
              </Link>
            )
          })}
        </section>
      )}

      {othersToday.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground mb-1">
            Outros jogos
          </p>
          {othersToday.map(f => (
            <Link
              key={f.id}
              href={`/play/${token}/selections/${f.id}`}
              className="flex items-center gap-2.5 border-b border-[oklch(0.16_0.015_265)] px-1 py-[9px] active:opacity-70"
            >
              <span className="text-[15px]">{f.home_team?.flag_emoji ?? '🏳️'}</span>
              <span className="flex-1 text-[13px] text-[oklch(0.75_0.008_265)] truncate">
                {f.home_team?.name ?? '—'}
                {f.status === 'FINISHED' || isLive(f)
                  ? ` ${f.home_score ?? 0}–${f.away_score ?? 0} `
                  : ' vs '}
                {f.away_team?.name ?? '—'}
              </span>
              {f.status === 'FINISHED' ? (
                <span className="text-[11px] font-semibold text-[oklch(0.45_0.01_265)]">FT</span>
              ) : isLive(f) ? (
                <LiveMinute utcDate={f.utc_date} />
              ) : (
                <span className="text-xs tabular-nums text-[oklch(0.45_0.01_265)]">
                  {toDisplayTime(f.utc_date)}
                </span>
              )}
            </Link>
          ))}
        </section>
      )}

      <details className="group">
        <summary className="cursor-pointer list-none text-center text-[13px] font-medium text-gold-dark active:opacity-70 py-1">
          ver calendário completo{' '}
          <span className="inline-block transition-transform duration-200 group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="mt-4 space-y-6">
          {groupFixturesByDate(fixtures).map(group => (
            <div key={group.dateKey}>
              <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.fixtures.map(f => (
                  <Link
                    key={f.id}
                    href={`/play/${token}/selections/${f.id}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded border text-sm active:opacity-70 ${
                      (f.home_team && myTeamIds.has(f.home_team.id)) ||
                      (f.away_team && myTeamIds.has(f.away_team.id))
                        ? 'border-gold/40 bg-gold-muted'
                        : 'border-night-border bg-night-card'
                    }`}
                  >
                    <span className="text-base w-6 text-center">
                      {f.home_team?.flag_emoji ?? '?'}
                    </span>
                    <span className="text-foreground flex-1 truncate">
                      {f.home_team?.name ?? '—'}
                    </span>
                    <span className="tabular-nums text-xs font-mono text-center w-14">
                      {f.status === 'FINISHED'
                        ? `${f.home_score ?? '?'} – ${f.away_score ?? '?'}`
                        : isLive(f)
                        ? 'AO VIVO'
                        : toDisplayTime(f.utc_date)}
                    </span>
                    <span className="text-foreground flex-1 truncate text-right">
                      {f.away_team?.name ?? '—'}
                    </span>
                    <span className="text-base w-6 text-center">
                      {f.away_team?.flag_emoji ?? '?'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
