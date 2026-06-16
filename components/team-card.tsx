import { MascotAvatar } from '@/components/mascot-avatar'
import type { ScoreBreakdown } from '@/lib/scoring'
import type { GoalStats } from '@/lib/ranking'
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
  mascot,
  pot,
  progress,
  breakdown,
  eliminated,
  goalStats,
}: {
  name: string
  flagEmoji: string
  mascot: string | null
  pot: number
  progress: TeamProgress
  breakdown: ScoreBreakdown
  eliminated: boolean
  goalStats: GoalStats
}) {
  const hasCinderela = breakdown.cinderelaBonusTotal > 0
  const stageLabel =
    eliminated && progress.stage_reached === 'group_stage'
      ? 'Eliminado nos grupos'
      : STAGE_LABELS[progress.stage_reached] ?? progress.stage_reached

  return (
    <details
      className={`group rounded-xl border border-night-border bg-night-card overflow-hidden open:border-[1.5px] open:border-gold/50 ${
        eliminated ? 'opacity-45' : ''
      }`}
    >
      <summary className="flex items-center gap-3 px-3.5 py-[11px] cursor-pointer list-none select-none active:opacity-70 group-open:bg-gold/8">
        <MascotAvatar
          mascot={mascot}
          alt={name}
          size={42}
          ring={eliminated ? 'eliminated' : 'default'}
          fallbackEmoji={flagEmoji}
          className={eliminated ? '' : 'group-open:border-gold'}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-semibold truncate text-foreground ${eliminated ? 'line-through' : ''}`}>
            {name}
            {hasCinderela && !eliminated ? ' ✨' : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            Pote {pot} · {stageLabel} · {goalStats.gamesPlayed}({goalStats.goalsFor}/{goalStats.goalsAgainst})
          </p>
        </div>
        <span className={`text-[17px] font-bold tabular-nums ${eliminated ? 'text-muted-foreground' : 'text-gold'}`}>
          {breakdown.total}
        </span>
        <svg
          className="w-3 h-3 text-[oklch(0.45_0.01_265)] shrink-0 transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="px-4 pt-2.5 pb-3 border-t border-night-border space-y-1.5 text-[13px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Jogos: {goalStats.gamesPlayed} · Golos: {goalStats.goalsFor} marcados, {goalStats.goalsAgainst} sofridos
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Fase de grupos ({progress.group_wins}V {progress.group_draws}E)
          </span>
          <span className="text-foreground tabular-nums">+{breakdown.groupStagePoints}</span>
        </div>

        {breakdown.knockoutDetail.map(r => (
          <div key={r.label} className="flex justify-between">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="text-foreground tabular-nums">+{r.points}</span>
          </div>
        ))}

        {hasCinderela && (
          <div className="-mx-2 flex justify-between rounded-lg bg-gold-muted px-2 py-[5px]">
            <span className="font-semibold text-gold">
              ✨ Bónus Cinderela ×{breakdown.cinderelaBonusDetail.length}
            </span>
            <span className="font-bold text-gold tabular-nums">
              +{breakdown.cinderelaBonusTotal}
            </span>
          </div>
        )}

        <div className="flex justify-between border-t border-night-border pt-1.5 mt-1.5">
          <span className="text-muted-foreground font-semibold">Total</span>
          <span className="text-gold font-bold tabular-nums">{breakdown.total} pts</span>
        </div>
      </div>
    </details>
  )
}
