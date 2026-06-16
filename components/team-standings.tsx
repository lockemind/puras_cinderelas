import type { getAllTeamsWithProgress } from '@/actions/results'
import { getScoreBreakdown } from '@/lib/scoring'
import type { TeamProgress, StageReached } from '@/lib/types'

type Teams = Awaited<ReturnType<typeof getAllTeamsWithProgress>>

const STAGE_LABELS: Record<string, string> = {
  group_stage: 'Fase de Grupos',
  r32: '1/16 de Final',
  r16: '1/8 de Final',
  qf: 'Quartos de Final',
  sf: 'Meia-Final',
  final: 'Final',
  champion: 'Campeão 🏆',
}

export function TeamStandings({ teams }: { teams: Teams }) {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map(pot => (
        <div key={pot}>
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">
            Pote {pot}
          </p>
          <div className="space-y-1">
            {teams
              .filter(t => t.pot === pot)
              .map(team => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const progress: TeamProgress = (team.team_progress as any) ?? {
                  team_id: team.id,
                  group_wins: 0,
                  group_draws: 0,
                  stage_reached: 'group_stage' as StageReached,
                  is_champion: false,
                  updated_at: '',
                }
                const breakdown = getScoreBreakdown(progress, pot)
                return (
                  <div
                    key={team.id}
                    className="flex items-center gap-3 px-3 py-2 rounded border border-night-border bg-night-card"
                  >
                    <span className="text-base">{team.flag_emoji}</span>
                    <span className="text-foreground text-sm flex-1 truncate">{team.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {STAGE_LABELS[progress.stage_reached] ?? progress.stage_reached}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {team.goalStats.gamesPlayed}({team.goalStats.goalsFor}/{team.goalStats.goalsAgainst})
                    </span>
                    <span className="text-gold text-xs font-semibold tabular-nums">
                      {breakdown.total} pts
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}
