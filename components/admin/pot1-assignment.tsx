'use client'

import { useTransition, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { assignPot1Team } from '@/actions/draft'
import type { Player } from '@/lib/types'

type Pot1Team = { id: string; name: string; flag_emoji: string }
type Assignment = { player_id: string; team_id: string }

interface Props {
  players: Player[]
  pot1Teams: Pot1Team[]
  assignments: Assignment[]
}

export function Pot1Assignment({ players, pot1Teams, assignments }: Props) {
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})

  function currentTeamId(playerId: string) {
    return assignments.find(a => a.player_id === playerId)?.team_id ?? ''
  }

  // Count how many players already have each team assigned (for duplicate indicator)
  function assignedCount(teamId: string) {
    return assignments.filter(a => a.team_id === teamId).length
  }

  function handleChange(playerId: string, value: string) {
    startTransition(async () => {
      try {
        await assignPot1Team(playerId, value || null)
        setErrors(e => ({ ...e, [playerId]: '' }))
      } catch (err) {
        setErrors(e => ({
          ...e,
          [playerId]: err instanceof Error ? err.message : 'Erro',
        }))
      }
    })
  }

  const allAssigned = players.length > 0 && players.every(p => currentTeamId(p.id))

  return (
    <Card className="bg-night-card border-night-border">
      <CardHeader>
        <CardTitle className="text-gold text-sm uppercase tracking-widest">
          Atribuição Pote 1
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {allAssigned && (
          <p className="text-sm text-green-400">
            ✓ Todos os jogadores têm equipa do Pote 1 atribuída.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Atribui manualmente a equipa do Pote 1 a cada jogador. É permitido que dois jogadores partilhem a mesma equipa.
        </p>
        <div className="space-y-2">
          {players.map(player => {
            const selectedId = currentTeamId(player.id)
            const selectedTeam = pot1Teams.find(t => t.id === selectedId)
            return (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded border border-night-border bg-night px-3 py-2"
              >
                <span className="text-foreground text-sm font-medium w-32 shrink-0 truncate">
                  {player.name}
                </span>
                <div className="flex-1 min-w-0">
                  <select
                    value={selectedId}
                    onChange={e => handleChange(player.id, e.target.value)}
                    disabled={pending}
                    className="w-full bg-night border border-night-border rounded px-2 py-1.5 text-foreground text-sm focus:outline-none focus:border-gold"
                  >
                    <option value="">— não atribuído —</option>
                    {pot1Teams.map(team => {
                      const count = assignedCount(team.id)
                      const isShared = count > 0 && team.id !== selectedId
                      return (
                        <option key={team.id} value={team.id}>
                          {team.flag_emoji} {team.name}
                          {isShared ? ` (partilhada ×${count})` : ''}
                        </option>
                      )
                    })}
                  </select>
                  {errors[player.id] && (
                    <p className="text-destructive text-xs mt-1">{errors[player.id]}</p>
                  )}
                </div>
                {selectedTeam && (
                  <span className="text-xl shrink-0">{selectedTeam.flag_emoji}</span>
                )}
              </div>
            )
          })}
        </div>
        {players.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-2">
            Cria os jogadores primeiro.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
