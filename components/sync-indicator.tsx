'use client'

import { useEffect, useState } from 'react'

export function SyncIndicator({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    function compute() {
      if (!lastSyncedAt) {
        setLabel('Aguarda primeira sincronização')
        return
      }
      const next = new Date(lastSyncedAt).getTime() + 30 * 60 * 1000
      const diffMs = next - Date.now()
      if (diffMs <= 0) {
        setLabel('Atualização pendente...')
        return
      }
      const mins = Math.ceil(diffMs / 60000)
      setLabel(`Próxima atualização em ${mins} min`)
    }

    compute()
    const interval = setInterval(compute, 30_000)
    return () => clearInterval(interval)
  }, [lastSyncedAt])

  if (!label) return null

  return (
    <p className="text-muted-foreground text-xs text-center">
      🔄 {label}
    </p>
  )
}
