type WinWorthBannerProps = {
  status: 'upcoming' | 'live' | 'finished'
  winPoints: number
  cinderelaBonus: number
  playerTeamWon: boolean
}

export function WinWorthBanner({ status, winPoints, cinderelaBonus, playerTeamWon }: WinWorthBannerProps) {
  if (winPoints <= 0 && cinderelaBonus <= 0) return null

  if (status === 'finished') {
    if (!playerTeamWon) return null
    const bonusPart = cinderelaBonus > 0 ? ` e +${cinderelaBonus} de bónus` : ''
    return (
      <div className="rounded-xl border border-[oklch(0.7_0.14_150/0.4)] bg-[oklch(0.7_0.14_150/0.10)] px-3.5 py-[11px] text-center">
        <span className="text-[oklch(0.7_0.14_150)] text-[12.5px] font-semibold">
          ✨ a tua cinderela avançou — ganhaste +{winPoints} pts{bonusPart}
        </span>
      </div>
    )
  }

  const bonusPart = cinderelaBonus > 0 ? ` e +${cinderelaBonus} de bónus cinderela` : ''
  const prefix = status === 'live' ? 'vencer ainda vale' : 'vitória vale'

  return (
    <div className="rounded-xl border border-gold/35 bg-gold-muted px-3.5 py-[11px] text-center">
      <span className="text-gold text-[12.5px] font-semibold">
        ✨ {prefix} +{winPoints} pts{bonusPart}
      </span>
    </div>
  )
}
