'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateTeamProgress, triggerManualSync } from '@/actions/results'
import type { StageReached } from '@/lib/types'

const STAGE_OPTIONS: Array<{ value: StageReached; label: string }> = [
  { value: 'group_stage', label: 'Fase de Grupos' },
  { value: 'r32', label: '1/16 de Final' },
  { value: 'r16', label: '1/8 de Final' },
  { value: 'qf', label: 'Quartos de Final' },
  { value: 'sf', label: 'Meia-Final' },
  { value: 'final', label: 'Final (eliminado)' },
  { value: 'champion', label: 'Campeão Mundial' },
]

type TeamRow = {
  id: string
  name: string
  pot: number
  flag_emoji: string
  team_progress: {
    group_wins: number
    group_draws: number
    stage_reached: string
    is_champion: boolean
  } | null
}

export function ResultsEditor({
  teams,
  lastSyncedAt,
}: {
  teams: TeamRow[]
  lastSyncedAt: string | null
}) {
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncOk, setSyncOk] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    setSyncOk(false)
    try {
      await triggerManualSync()
      setSyncOk(true)
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync falhou')
    } finally {
      setSyncing(false)
    }
  }

  async function handleSave(
    teamId: string,
    groupWins: number,
    groupDraws: number,
    stageReached: StageReached
  ) {
    setSaving(teamId)
    try {
      await updateTeamProgress({
        teamId,
        groupWins,
        groupDraws,
        stageReached,
        isChampion: stageReached === 'champion',
      })
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card className="bg-night-card border-night-border">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-gold text-sm uppercase tracking-widest">
            Resultados das Seleções
          </CardTitle>
          <div className="flex flex-col items-end gap-1">
            <Button
              onClick={handleSync}
              disabled={syncing}
              size="sm"
              variant="outline"
              className="border-gold text-gold hover:bg-gold-muted text-xs"
            >
              {syncing ? 'A sincronizar...' : '🔄 Sincronizar agora'}
            </Button>
            {lastSyncedAt && (
              <span className="text-muted-foreground text-xs">
                Último sync: {new Date(lastSyncedAt).toLocaleString('pt-PT')}
              </span>
            )}
            {!lastSyncedAt && (
              <span className="text-muted-foreground text-xs">
                Nunca sincronizado
              </span>
            )}
            {syncOk && <span className="text-green-400 text-xs">✓ Sincronizado</span>}
            {syncError && <span className="text-destructive text-xs">⚠️ {syncError}</span>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3, 4].map(pot => (
          <div key={pot}>
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1 mt-3">
              Pote {pot}
            </p>
            {teams
              .filter(t => t.pot === pot)
              .map(team => {
                const progress = team.team_progress ?? {
                  group_wins: 0,
                  group_draws: 0,
                  stage_reached: 'group_stage',
                  is_champion: false,
                }
                return (
                  <TeamResultRow
                    key={team.id}
                    team={team}
                    progress={progress}
                    saving={saving === team.id}
                    onSave={(gw, gd, sr) => handleSave(team.id, gw, gd, sr)}
                  />
                )
              })}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function TeamResultRow({
  team,
  progress,
  saving,
  onSave,
}: {
  team: TeamRow
  progress: { group_wins: number; group_draws: number; stage_reached: string }
  saving: boolean
  onSave: (gw: number, gd: number, sr: StageReached) => void
}) {
  const [wins, setWins] = useState(String(progress.group_wins))
  const [draws, setDraws] = useState(String(progress.group_draws))
  const [stage, setStage] = useState<StageReached>(progress.stage_reached as StageReached)

  return (
    <div className="flex items-center gap-2 py-2 border-b border-night-border last:border-0 flex-wrap">
      <span className="text-base w-6">{team.flag_emoji}</span>
      <span className="text-foreground text-sm w-36 shrink-0">{team.name}</span>
      <div className="flex items-center gap-1">
        <label className="text-muted-foreground text-xs">V</label>
        <Input
          type="number"
          min={0}
          max={99}
          value={wins}
          onChange={e => setWins(e.target.value)}
          className="w-12 h-7 text-xs bg-night border-night-border text-center"
        />
      </div>
      <div className="flex items-center gap-1">
        <label className="text-muted-foreground text-xs">E</label>
        <Input
          type="number"
          min={0}
          max={99}
          value={draws}
          onChange={e => setDraws(e.target.value)}
          className="w-12 h-7 text-xs bg-night border-night-border text-center"
        />
      </div>
      <Select value={stage} onValueChange={v => setStage(v as StageReached)}>
        <SelectTrigger className="h-7 text-xs bg-night border-night-border w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-night-card border-night-border">
          {STAGE_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        onClick={() => onSave(Number(wins), Number(draws), stage)}
        disabled={saving}
        className="h-7 text-xs bg-gold text-night hover:bg-gold-light"
      >
        {saving ? '...' : 'Guardar'}
      </Button>
    </div>
  )
}
