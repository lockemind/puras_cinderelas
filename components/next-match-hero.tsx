'use client'

import Link from 'next/link'
import { MascotAvatar } from '@/components/mascot-avatar'
import { useTickingNow } from '@/components/live-minute'
import { estimateMatchTiming } from '@/lib/match-timing'

type HeroTeam = { name: string; mascot: string | null; flagEmoji: string }

export function NextMatchHero({
  href,
  myTeam,
  opponent,
  utcDate,
  isLive,
  stageLabel,
  kickoffTime,
  winPoints,
  cinderelaBonus,
}: {
  href: string
  myTeam: HeroTeam
  opponent: HeroTeam
  utcDate: string
  isLive: boolean
  stageLabel: string
  kickoffTime: string
  winPoints: number
  cinderelaBonus: number
}) {
  const now = useTickingNow()
  const diffMin = Math.round((new Date(utcDate).getTime() - now) / 60_000)
  const live = isLive || diffMin <= 0

  const estimate = estimateMatchTiming(utcDate, now)

  let centerLabel: string
  let centerValue: string
  if (live) {
    centerLabel = estimate.estimatedPhase === 'HALF_TIME' ? 'intervalo' : 'ao vivo (est.)'
    centerValue = estimate.displayLabel
  } else {
    centerLabel = 'começa em'
    const h = Math.floor(diffMin / 60)
    const m = diffMin % 60
    centerValue = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
  }

  return (
    <Link
      href={href}
      className="block rounded-2xl border-[1.5px] border-gold/40 bg-[linear-gradient(180deg,oklch(0.16_0.02_265),oklch(0.12_0.015_265))] px-3.5 pt-4 pb-3 active:opacity-70"
    >
      <p className="text-center text-[10px] font-bold uppercase tracking-[2.5px] text-gold">
        O teu próximo jogo
      </p>

      <div className="mt-3 flex items-center justify-around">
        <div className="flex flex-col items-center gap-1.5 min-w-0">
          <MascotAvatar
            mascot={myTeam.mascot}
            alt={myTeam.name}
            size={72}
            ring="gold"
            ringWidth={2.5}
            glow
            fallbackEmoji={myTeam.flagEmoji}
          />
          <p className="text-[13px] font-bold text-foreground truncate">{myTeam.name}</p>
        </div>

        <div className="flex flex-col items-center gap-0.5 px-1">
          <p className="text-[11px] text-muted-foreground">{centerLabel}</p>
          <p
            className="text-[26px] font-extrabold tabular-nums text-gold leading-tight"
            suppressHydrationWarning
          >
            {centerValue}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {stageLabel} · {kickoffTime}
          </p>
        </div>

        <div className="flex flex-col items-center gap-1.5 min-w-0">
          <MascotAvatar
            mascot={opponent.mascot}
            alt={opponent.name}
            size={72}
            ring="neutral"
            fallbackEmoji={opponent.flagEmoji}
          />
          <p className="text-[13px] font-medium text-muted-foreground truncate">{opponent.name}</p>
        </div>
      </div>

      {winPoints > 0 && (
        <p className="mt-3 border-t border-night-border pt-[9px] text-center text-xs font-semibold text-gold">
          ✨ vitória vale +{winPoints} pts
          {cinderelaBonus > 0 ? ` e +${cinderelaBonus} de bónus cinderela` : ''}
        </p>
      )}
    </Link>
  )
}
