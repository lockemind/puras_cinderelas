export function ScoreHero({
  total,
  rank,
  pointsToday,
}: {
  total: number
  rank: number | null
  pointsToday: number | null
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 pt-[18px] pb-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[3px] text-muted-foreground">
        Os meus pontos
      </p>
      <p className="text-[64px] font-extrabold leading-none tabular-nums text-gold [text-shadow:0_0_40px_oklch(0.82_0.15_85/0.35)]">
        {total}
      </p>
      <div className="flex items-center gap-2">
        {rank != null && (
          <span className="rounded-full border border-gold/35 bg-gold-muted px-3 py-[3px] text-xs font-semibold text-gold">
            {rank}º lugar
          </span>
        )}
        {pointsToday != null && pointsToday > 0 && (
          <span className="text-xs font-semibold text-[oklch(0.7_0.14_150)]">
            ▲ +{pointsToday} hoje
          </span>
        )}
      </div>
    </div>
  )
}
