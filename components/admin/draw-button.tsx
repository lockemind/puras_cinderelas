'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { executeDraw } from '@/actions/draft'

export function DrawButton({ drawDone }: { drawDone: boolean }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(drawDone)
  const [error, setError] = useState<string | null>(null)

  async function handleDraw() {
    if (!confirm('Confirmas o sorteio do Pote 1? Esta ação não pode ser desfeita.')) return
    setLoading(true)
    setError(null)
    try {
      await executeDraw()
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro no sorteio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-night-card border-night-border">
      <CardHeader>
        <CardTitle className="text-gold text-sm uppercase tracking-widest">
          Sorteio do Pote 1
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {done ? (
          <p className="text-sm text-muted-foreground">
            ✓ Sorteio concluído. Cada jogador tem uma equipa do Pote 1 atribuída.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Atribui aleatoriamente as 12 equipas do Pote 1 aos 12 jogadores.
              Garante que todos os 12 jogadores estão criados antes de executar.
            </p>
            <Button
              onClick={handleDraw}
              disabled={loading}
              className="bg-gold text-night hover:bg-gold-light font-semibold"
            >
              {loading ? 'A sortear...' : '🎲 Executar Sorteio'}
            </Button>
          </>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
      </CardContent>
    </Card>
  )
}
