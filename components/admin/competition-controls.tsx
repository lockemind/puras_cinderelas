'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { advanceStatus } from '@/actions/competition'
import { triggerFixturesSync } from '@/actions/fixtures'
import type { Competition } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  setup: 'Configuração',
  draft: 'Sorteio / Draft',
  locked: 'Bloqueado',
  running: 'A decorrer',
  finished: 'Terminado',
}

const ADVANCE_LABELS: Record<string, string> = {
  setup: 'Avançar para Draft',
  draft: 'Bloquear escolhas',
  locked: 'Iniciar torneio',
  running: 'Terminar competição',
  finished: '',
}

export function CompetitionControls({
  competition,
}: {
  competition: Competition
}) {
  const [loading, setLoading] = useState(false)
  const [fixturesLoading, setFixturesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdvance() {
    setLoading(true)
    setError(null)
    try {
      await advanceStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function handleSyncFixtures() {
    setFixturesLoading(true)
    setError(null)
    try {
      await triggerFixturesSync()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setFixturesLoading(false)
    }
  }

  const advanceLabel = ADVANCE_LABELS[competition.status]

  return (
    <Card className="bg-night-card border-night-border">
      <CardHeader>
        <CardTitle className="text-gold text-sm uppercase tracking-widest">
          Estado da Competição
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Estado atual:</span>
          <span className="text-foreground font-semibold">
            {STATUS_LABELS[competition.status] ?? competition.status}
          </span>
        </div>
        {advanceLabel && (
          <Button
            onClick={handleAdvance}
            disabled={loading}
            className="bg-gold text-night hover:bg-gold-light font-semibold"
          >
            {loading ? 'A processar...' : advanceLabel}
          </Button>
        )}
        <Button
          onClick={handleSyncFixtures}
          disabled={fixturesLoading}
          variant="outline"
          className="border-night-border text-foreground"
        >
          {fixturesLoading ? 'A sincronizar...' : 'Sync Fixtures'}
        </Button>
        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
