'use client'

import { useState } from 'react'
import { MascotAvatar } from '@/components/mascot-avatar'
import type { RankingEntryWithDelta } from '@/actions/results'
import type { GoalStats } from '@/lib/ranking'

function CompactStats({ stats, className }: { stats: GoalStats; className?: string }) {
  return (
    <span className={`text-[11px] tabular-nums text-muted-foreground ${className ?? ''}`}>
      {stats.gamesPlayed}({stats.goalsFor}/{stats.goalsAgainst})
    </span>
  )
}

const STAGE_SHORT: Record<string, string> = {
  group_stage: 'Grupos',
  r32: '1/16',
  r16: '1/8',
  qf: 'Quartos',
  sf: 'Meias',
  final: 'Final',
  champion: '🏆',
}

function CinderelaSparkle({ className = '' }: { className?: string }) {
  return (
    <span
      aria-label="Bónus Cinderela"
      className={`shrink-0 text-gold ${className}`}
    >
      ✨
    </span>
  )
}

export function RankingTable({
  rankings,
  expandedId,
  isLocked,
}: {
  rankings: RankingEntryWithDelta[]
  expandedId?: string
  isLocked: boolean
}) {
  const podium = rankings.slice(0, 3)
  const rest = rankings.slice(3)
  const [openPodiumId, setOpenPodiumId] = useState<string | null>(null)
  const openPodiumEntry = podium.find(e => e.player.id === openPodiumId)

  const togglePodium = (entry: RankingEntryWithDelta) => {
    const canExpand = isLocked || entry.player.id === expandedId
    if (!canExpand) return
    setOpenPodiumId(prev => (prev === entry.player.id ? null : entry.player.id))
  }

  return (
    <div className="space-y-3">
      {podium.length === 3 ? (
        <>
          <div className="mt-3 grid grid-cols-[1fr_1.15fr_1fr] items-end gap-2">
            <PodiumCard entry={podium[1]} place={2} isOpen={openPodiumId === podium[1].player.id} isCurrentPlayer={podium[1].player.id === expandedId} onToggle={togglePodium} />
            <PodiumCard entry={podium[0]} place={1} isOpen={openPodiumId === podium[0].player.id} isCurrentPlayer={podium[0].player.id === expandedId} onToggle={togglePodium} />
            <PodiumCard entry={podium[2]} place={3} isOpen={openPodiumId === podium[2].player.id} isCurrentPlayer={podium[2].player.id === expandedId} onToggle={togglePodium} />
          </div>
          {openPodiumEntry && (
            <div
              className={`overflow-hidden ${
                openPodiumEntry.player.id === expandedId
                  ? 'rounded-[10px] border-[1.5px] border-gold/55 bg-gold-muted'
                  : 'rounded-[10px] border border-night-border bg-night-card'
              }`}
            >
              <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                <RowHeader
                  entry={openPodiumEntry}
                  isCurrentPlayer={openPodiumEntry.player.id === expandedId}
                />
              </div>
              <TeamsDetail entry={openPodiumEntry} />
            </div>
          )}
        </>
      ) : (
        podium.map(e => (
          <RankingRow
            key={e.player.id}
            entry={e}
            isCurrentPlayer={e.player.id === expandedId}
            isLocked={isLocked}
          />
        ))
      )}

      <div className="space-y-1.5">
        {rest.map(entry => (
          <RankingRow
            key={entry.player.id}
            entry={entry}
            isCurrentPlayer={entry.player.id === expandedId}
            isLocked={isLocked}
          />
        ))}
      </div>
    </div>
  )
}

function PodiumCard({
  entry,
  place,
  isOpen,
  isCurrentPlayer,
  onToggle,
}: {
  entry: RankingEntryWithDelta
  place: 1 | 2 | 3
  isOpen: boolean
  isCurrentPlayer: boolean
  onToggle: (entry: RankingEntryWithDelta) => void
}) {
  const pot1 = entry.teams.find(t => t.pot === 1)
  const tuBadge = isCurrentPlayer && (
    <span className="rounded-md bg-gold px-1.5 py-0.5 text-[9px] font-extrabold tracking-[1px] text-night">
      TU
    </span>
  )

  if (place === 1) {
    return (
      <button
        type="button"
        onClick={() => onToggle(entry)}
        className={`relative flex w-full flex-col items-center gap-[5px] rounded-[14px] border bg-[linear-gradient(180deg,oklch(0.82_0.15_85/0.16),oklch(0.13_0.015_265))] px-2 pt-4 pb-3 active:opacity-70 ${
          isOpen ? 'border-[1.5px] border-gold' : 'border-gold/45'
        }`}
      >
        <span className="absolute -top-[11px] left-1/2 -translate-x-1/2 text-lg">👑</span>
        <MascotAvatar
          mascot={pot1?.team.mascot ?? null}
          alt={pot1?.team.name ?? ''}
          size={58}
          ring={pot1?.eliminated ? 'eliminated' : 'gold'}
          ringWidth={2.5}
          fallbackEmoji={pot1?.team.flag_emoji}
          className={pot1?.eliminated ? 'opacity-60' : ''}
        />
        <p className="flex max-w-full items-center gap-1.5 truncate text-sm font-bold text-foreground">
          {entry.player.name}
          {tuBadge}
        </p>
        <p className="text-xl font-extrabold tabular-nums text-gold">{entry.totalScore}</p>
        <CompactStats stats={{ gamesPlayed: entry.gamesPlayed, goalsFor: entry.goalsFor, goalsAgainst: entry.goalsAgainst }} />
        <p className="text-[11px] font-semibold text-gold">1º</p>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(entry)}
      className={`flex w-full flex-col items-center gap-[5px] rounded-xl border bg-night-card px-2 pt-3 pb-2.5 active:opacity-70 ${
        isOpen ? 'border-[1.5px] border-gold/55' : 'border-night-border'
      }`}
    >
      <MascotAvatar
        mascot={pot1?.team.mascot ?? null}
        alt={pot1?.team.name ?? ''}
        size={place === 2 ? 46 : 42}
        ring={pot1?.eliminated ? 'eliminated' : 'default'}
        fallbackEmoji={pot1?.team.flag_emoji}
        className={pot1?.eliminated ? 'opacity-60' : ''}
      />
      <p className="flex max-w-full items-center gap-1.5 truncate text-[13px] font-semibold text-foreground">
        {entry.player.name}
        {tuBadge}
      </p>
      <p className="text-base font-bold tabular-nums text-gold">{entry.totalScore}</p>
      <CompactStats stats={{ gamesPlayed: entry.gamesPlayed, goalsFor: entry.goalsFor, goalsAgainst: entry.goalsAgainst }} />
      <p className="text-[11px] text-muted-foreground">{place}º</p>
    </button>
  )
}

function TeamsDetail({ entry }: { entry: RankingEntryWithDelta }) {
  return (
    <div className="space-y-1 border-t border-night-border px-3.5 pb-3 pt-1">
      {[...entry.teams]
        .sort((a, b) => a.pot - b.pot)
        .map(t => (
          <div
            key={t.team.id}
            className="flex items-center gap-2 py-1 text-sm"
          >
            <span className={`text-base ${t.eliminated ? 'opacity-60' : ''}`}>
              {t.team.flag_emoji}
            </span>
            <span
              className={`flex flex-1 items-center gap-1.5 ${
                t.eliminated ? 'text-muted-foreground opacity-60' : 'text-foreground'
              }`}
            >
              <span className="truncate">{t.team.name}</span>
              {t.breakdown.cinderelaBonusTotal > 0 && <CinderelaSparkle className="text-xs" />}
            </span>
            <span className={`text-xs text-muted-foreground ${t.eliminated ? 'opacity-60' : ''}`}>
              {STAGE_SHORT[t.progress.stage_reached] ?? t.progress.stage_reached}
            </span>
            <CompactStats stats={t.goalStats} className={t.eliminated ? 'opacity-60' : ''} />
            <span className="text-xs font-semibold tabular-nums text-gold">
              {t.breakdown.total} pts
            </span>
          </div>
        ))}
    </div>
  )
}

function Delta({ delta }: { delta: number | null }) {
  if (delta == null || delta === 0) {
    return <span className="text-[11px] font-semibold text-[oklch(0.40_0.01_265)]">—</span>
  }
  return delta > 0 ? (
    <span className="text-[11px] font-semibold text-[oklch(0.7_0.14_150)]">▲{delta}</span>
  ) : (
    <span className="text-[11px] font-semibold text-destructive">▼{Math.abs(delta)}</span>
  )
}

function RowHeader({
  entry,
  isCurrentPlayer,
}: {
  entry: RankingEntryWithDelta
  isCurrentPlayer: boolean
}) {
  return (
    <>
      <span className="w-[18px] text-center text-[13px] text-muted-foreground tabular-nums">
        {entry.rank}
      </span>
      <span
        className={`flex flex-1 items-center gap-2 truncate text-sm text-foreground ${
          isCurrentPlayer ? 'font-bold' : 'font-medium'
        }`}
      >
        {entry.player.name}
        {isCurrentPlayer && (
          <span className="rounded-md bg-gold px-1.5 py-0.5 text-[9px] font-extrabold tracking-[1px] text-night">
            TU
          </span>
        )}
      </span>
      <Delta delta={entry.rankDelta} />
      <CompactStats stats={{ gamesPlayed: entry.gamesPlayed, goalsFor: entry.goalsFor, goalsAgainst: entry.goalsAgainst }} />
      <span
        className={`text-sm tabular-nums text-gold ${
          isCurrentPlayer ? 'font-extrabold' : 'font-bold'
        }`}
      >
        {entry.totalScore}
      </span>
    </>
  )
}

function RankingRow({
  entry,
  isCurrentPlayer,
  isLocked,
}: {
  entry: RankingEntryWithDelta
  isCurrentPlayer: boolean
  isLocked: boolean
}) {
  const canExpand = isLocked || isCurrentPlayer
  const rowClass = isCurrentPlayer
    ? 'rounded-[10px] border-[1.5px] border-gold/55 bg-gold-muted'
    : 'rounded-[10px] border border-night-border bg-night-card'

  if (!canExpand) {
    return (
      <div className={`overflow-hidden ${rowClass}`}>
        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
          <RowHeader entry={entry} isCurrentPlayer={isCurrentPlayer} />
        </div>
      </div>
    )
  }

  return (
    <details open={isCurrentPlayer} className={`group overflow-hidden ${rowClass}`}>
      <summary className="flex cursor-pointer list-none select-none items-center gap-2.5 px-3.5 py-2.5 active:opacity-70">
        <RowHeader entry={entry} isCurrentPlayer={isCurrentPlayer} />
        <svg
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <TeamsDetail entry={entry} />
    </details>
  )
}
