import type { getRankings } from '@/actions/results'

type Rankings = Awaited<ReturnType<typeof getRankings>>

const STAGE_SHORT: Record<string, string> = {
  group_stage: 'GR',
  r32: '1/16',
  r16: '1/8',
  qf: 'QF',
  sf: 'SF',
  final: 'F',
  champion: '🏆',
}

export function RankingTable({
  rankings,
  expandedId,
  isLocked,
}: {
  rankings: Rankings
  expandedId?: string
  isLocked: boolean
}) {
  return (
    <div className="space-y-1">
      {rankings.map((entry, idx) => (
        <RankingRow
          key={entry.player.id}
          position={idx + 1}
          entry={entry}
          isCurrentPlayer={expandedId === entry.player.id}
          isLocked={isLocked}
        />
      ))}
    </div>
  )
}

function RankingRow({
  position,
  entry,
  isCurrentPlayer,
  isLocked,
}: {
  position: number
  entry: Rankings[number]
  isCurrentPlayer: boolean
  isLocked: boolean
}) {
  const canExpand = isLocked || isCurrentPlayer

  const summary = (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-muted-foreground text-sm w-5 text-center font-mono">
        {position}
      </span>
      <span className="text-foreground font-medium flex-1">{entry.player.name}</span>
      <span className="text-gold font-bold tabular-nums">
        {entry.totalScore} pts
      </span>
    </div>
  )

  const teamsDetail = (
    <div className="px-4 pb-3 border-t border-night-border space-y-1">
      {entry.teams
        .sort((a, b) => a.pot - b.pot)
        .map(t => (
          <div
            key={t.team.id}
            className="flex items-center gap-2 text-sm py-1"
          >
            <span className="text-base">{t.team.flag_emoji}</span>
            <span className="text-foreground flex-1">{t.team.name}</span>
            <span className="text-muted-foreground text-xs">
              {STAGE_SHORT[t.progress.stage_reached] ?? t.progress.stage_reached}
            </span>
            <span className="text-gold font-semibold tabular-nums text-xs">
              {t.breakdown.total} pts
            </span>
          </div>
        ))}
    </div>
  )

  if (!canExpand) {
    return (
      <div className="rounded border border-night-border bg-night-card overflow-hidden">
        {summary}
      </div>
    )
  }

  return (
    <details
      open={isCurrentPlayer}
      className="rounded border border-night-border bg-night-card overflow-hidden"
    >
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
        <span className="text-muted-foreground text-sm w-5 text-center font-mono">
          {position}
        </span>
        <span className="text-foreground font-medium flex-1">{entry.player.name}</span>
        <span className="text-gold font-bold tabular-nums">
          {entry.totalScore} pts
        </span>
      </summary>
      {teamsDetail}
    </details>
  )
}
