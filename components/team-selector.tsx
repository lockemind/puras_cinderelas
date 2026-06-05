'use client'

import { useState } from 'react'
import { chooseTeam } from '@/actions/draft'

type Team = { id: string; name: string; flag_emoji: string }

export function TeamSelector({
  pot,
  teams,
  currentTeamId,
  playerToken,
}: {
  pot: 2 | 3 | 4
  teams: Team[]
  currentTeamId: string | null
  playerToken: string
}) {
  const [selected, setSelected] = useState<string | null>(currentTeamId)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleChoose(teamId: string) {
    setLoading(teamId)
    setError(null)
    try {
      await chooseTeam(playerToken, teamId, pot)
      setSelected(teamId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao escolher equipa')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs uppercase tracking-wider">
        Pote {pot} — {selected ? 'escolhido' : 'escolhe uma equipa'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {teams.map(team => {
          const isSelected = selected === team.id
          return (
            <button
              key={team.id}
              onClick={() => handleChoose(team.id)}
              disabled={!!loading}
              className={`
                flex items-center gap-2 px-3 py-2 rounded border text-sm transition-colors
                ${isSelected
                  ? 'border-gold bg-gold-muted text-gold font-semibold'
                  : 'border-night-border bg-night text-foreground hover:border-gold/50'
                }
              `}
            >
              <span className="text-base">{team.flag_emoji}</span>
              <span className="truncate">{team.name}</span>
              {loading === team.id && (
                <span className="ml-auto text-muted-foreground text-xs">...</span>
              )}
            </button>
          )
        })}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}
