'use client'

import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createGuestPlayer, createPlayer } from '@/actions/players'
import { getPlayerDisplayName } from '@/lib/player-display'
import type { Player } from '@/lib/types'

function subscribeToOrigin() {
  return () => {}
}

function getBrowserOrigin() {
  return window.location.origin
}

function getServerOrigin() {
  return ''
}

export function PlayersManager({ players }: { players: Player[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const baseUrl = useSyncExternalStore(
    subscribeToOrigin,
    getBrowserOrigin,
    getServerOrigin
  )

  const participantCount = players.filter(player => !player.is_guest).length
  const hasGuest = players.some(player => player.is_guest)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      await createPlayer(name)
      setName('')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar jogador')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateGuest() {
    setGuestLoading(true)
    setError(null)
    try {
      await createGuestPlayer()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar convidado')
    } finally {
      setGuestLoading(false)
    }
  }

  return (
    <Card className="bg-night-card border-night-border">
      <CardHeader>
        <CardTitle className="text-gold text-sm uppercase tracking-widest">
          Jogadores ({participantCount}/13)
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
            disabled={loading || participantCount >= 13}
            className="bg-gold text-night hover:bg-gold-light font-semibold shrink-0"
          >
            {loading ? '...' : 'Adicionar'}
          </Button>
        </div>
        <Button
          onClick={handleCreateGuest}
          disabled={guestLoading || hasGuest}
          variant="outline"
          className="border-night-border text-foreground hover:bg-night w-full"
        >
          {guestLoading ? '...' : hasGuest ? 'Conta de convidado criada' : 'Criar conta de convidado'}
        </Button>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="space-y-2">
          {players.map(player => (
            <div
              key={player.id}
              className="flex flex-col gap-1 rounded border border-night-border bg-night p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-foreground font-medium">
                  {getPlayerDisplayName(player)}
                </span>
                {player.is_guest && (
                  <Badge variant="outline" className="border-gold/30 text-gold">
                    Convidado
                  </Badge>
                )}
              </div>
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
