'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createPlayer } from '@/actions/players'
import type { Player } from '@/lib/types'

export function PlayersManager({ players }: { players: Player[] }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      await createPlayer(name)
      setName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar jogador')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-night-card border-night-border">
      <CardHeader>
        <CardTitle className="text-gold text-sm uppercase tracking-widest">
          Jogadores ({players.length}/12)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome do jogador"
            className="bg-night border-night-border text-foreground"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <Button
            onClick={handleCreate}
            disabled={loading || players.length >= 12}
            className="bg-gold text-night hover:bg-gold-light font-semibold shrink-0"
          >
            {loading ? '...' : 'Adicionar'}
          </Button>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="space-y-2">
          {players.map(player => (
            <div
              key={player.id}
              className="flex flex-col gap-1 rounded border border-night-border bg-night p-3"
            >
              <span className="text-foreground font-medium">{player.name}</span>
              <a
                href={`${baseUrl}/play/${player.access_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground text-xs break-all hover:text-gold transition-colors"
              >
                {baseUrl}/play/{player.access_token}
              </a>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
