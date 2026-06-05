import type { ScoreBreakdown } from '@/lib/scoring'
import type { TeamProgress } from '@/lib/types'

const STAGE_LABELS: Record<string, string> = {
  group_stage: 'Fase de Grupos',
  r32: '1/16 de Final',
  r16: '1/8 de Final',
  qf: 'Quartos de Final',
  sf: 'Meia-Final',
  final: 'Final',
  champion: 'Campeão Mundial 🏆',
}

export function TeamCard({
  name,
  flagEmoji,
  pot,
  progress,
  breakdown,
}: {
  name: string
  flagEmoji: string
  pot: number
  progress: TeamProgress
  breakdown: ScoreBreakdown
}) {
  return (
    <details className="rounded border border-night-border bg-night-card overflow-hidden">
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
        <span className="text-2xl">{flagEmoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-semibold truncate">{name}</p>
          <p className="text-muted-foreground text-xs">
            Pote {pot} · {STAGE_LABELS[progress.stage_reached] ?? progress.stage_reached}
          </p>
        </div>
        <span className="text-gold font-bold text-lg tabular-nums">
          {breakdown.total}
        </span>
      </summary>

      <div className="px-4 pb-3 pt-2 border-t border-night-border space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Fase de grupos ({progress.group_wins}V {progress.group_draws}E)
          </span>
          <span className="text-foreground tabular-nums">
            +{breakdown.groupStagePoints}
          </span>
        </div>

        {breakdown.knockoutDetail.map(r => (
          <div key={r.label} className="flex justify-between">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="text-foreground tabular-nums">+{r.points}</span>
          </div>
        ))}

        {breakdown.cinderelaBonusDetail.map(b => (
          <div key={b.label} className="flex justify-between">
            <span className="text-yellow-400/80 text-xs">
              ✨ Bónus Cinderela · {b.label}
            </span>
            <span className="text-yellow-400 tabular-nums">+{b.points}</span>
          </div>
        ))}

        <div className="flex justify-between border-t border-night-border pt-1 mt-1 font-semibold">
          <span className="text-muted-foreground">Total</span>
          <span className="text-gold">{breakdown.total} pts</span>
        </div>
      </div>
    </details>
  )
}
