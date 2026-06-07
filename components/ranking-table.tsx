import Image from 'next/image'
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

function MascotIcons({ teams }: { teams: Rankings[number]['teams'] }) {
  return (
    <span className="flex items-center gap-0.5 flex-shrink-0">
      {teams.map(t =>
        t.team.mascot ? (
          <Image
            key={t.pot}
            src={`/mascots/icons/${t.team.mascot}.webp`}
            alt={t.team.name}
            width={20}
            height={20}
            className="rounded-sm"
          />
        ) : null
      )}
    </span>
  )
}

function RowHeader({
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
  const showAllIcons = isLocked || isCurrentPlayer
  const sortedTeams = [...entry.teams].sort((a, b) => a.pot - b.pot)
  const pot1Team = sortedTeams.find(t => t.pot === 1)
  const iconsToShow = showAllIcons ? sortedTeams : pot1Team ? [pot1Team] : []

  return (
    <>
      <span className="text-muted-foreground text-sm w-5 text-center font-mono">
        {position}
      </span>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-foreground font-medium truncate">{entry.player.name}</span>
        {iconsToShow.length > 0 && <MascotIcons teams={iconsToShow} />}
      </div>
      <span className="text-gold font-bold tabular-nums">
        {entry.totalScore} pts
      </span>
    </>
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
        <div className="flex items-center gap-3 px-4 py-3">
          <RowHeader
            position={position}
            entry={entry}
            isCurrentPlayer={isCurrentPlayer}
            isLocked={isLocked}
          />
        </div>
      </div>
    )
  }

  return (
    <details
      open={isCurrentPlayer}
      className="rounded border border-night-border bg-night-card overflow-hidden"
    >
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
        <RowHeader
          position={position}
          entry={entry}
          isCurrentPlayer={isCurrentPlayer}
          isLocked={isLocked}
        />
      </summary>
      {teamsDetail}
    </details>
  )
}
