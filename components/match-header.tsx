import type { Fixture } from '@/lib/types'
import { toDisplayDate, toDisplayTime } from '@/lib/fixtures'

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Fase de Grupos',
  LAST_32: '1/16 de Final',
  LAST_16: '1/8 de Final',
  QUARTER_FINALS: 'Quartos de Final',
  SEMI_FINALS: 'Meia-Final',
  FINAL: 'Final',
}

const STATUS_DISPLAY: Record<string, string> = {
  IN_PLAY: 'AO VIVO',
  PAUSED: 'INT',
  LIVE: 'AO VIVO',
  POSTPONED: 'ADI',
  CANCELLED: 'CANC',
}

export function MatchHeader({ fixture }: { fixture: Fixture }) {
  const isFinished = fixture.status === 'FINISHED'
  const isLive = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(fixture.status)

  const centerDisplay = isFinished
    ? `${fixture.home_score ?? '?'} – ${fixture.away_score ?? '?'}`
    : toDisplayTime(fixture.utc_date)

  const statusLabel = isFinished
    ? 'FT'
    : isLive
    ? STATUS_DISPLAY[fixture.status]
    : null

  const stageName = STAGE_LABELS[fixture.stage] ?? fixture.stage
  const group = fixture.group ? ` ${fixture.group}` : ''
  const subLine = `${stageName}${group} · ${toDisplayDate(fixture.utc_date)} · ${toDisplayTime(fixture.utc_date)}`

  return (
    <div className="bg-night-card border border-night-border rounded-xl p-4">
      <div className="flex justify-around items-center mb-2">
        <div className="text-center flex-1">
          <div className="text-4xl">{fixture.home_team?.flag_emoji ?? '?'}</div>
          <div className="text-sm text-foreground mt-1 truncate">{fixture.home_team?.name ?? '—'}</div>
        </div>
        <div className="text-center px-2">
          <div className="text-gold font-bold text-xl tabular-nums">{centerDisplay}</div>
          {statusLabel && (
            <div className="text-xs text-muted-foreground mt-0.5">{statusLabel}</div>
          )}
        </div>
        <div className="text-center flex-1">
          <div className="text-4xl">{fixture.away_team?.flag_emoji ?? '?'}</div>
          <div className="text-sm text-foreground mt-1 truncate">{fixture.away_team?.name ?? '—'}</div>
        </div>
      </div>
      <div className="text-center text-xs text-muted-foreground mt-1">{subLine}</div>
    </div>
  )
}
