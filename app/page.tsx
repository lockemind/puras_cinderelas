import Image from 'next/image'
import { getCompetition } from '@/actions/competition'
import { getRankingsWithDeltas } from '@/actions/results'
import { RankingTable } from '@/components/ranking-table'
import { SyncIndicator } from '@/components/sync-indicator'

const STATUS_MESSAGES: Record<string, string> = {
  setup: 'Competição em preparação',
  draft: 'Sorteio em curso — escolhas abertas',
  locked: 'Escolhas encerradas — a aguardar o início',
  running: 'A decorrer',
  finished: 'Competição terminada',
}

export const dynamic = 'force-dynamic'

export default async function PublicPage() {
  const [competition, rankings] = await Promise.all([
    getCompetition(),
    getRankingsWithDeltas(),
  ])

  const isRunningOrAfter = ['running', 'finished'].includes(competition.status)
  const isLocked = ['locked', 'running', 'finished'].includes(competition.status)

  return (
    <div className="min-h-dvh bg-night px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8 text-center">
        <Image
          src="/logo.jpg"
          alt="Puras Cinderelas"
          width={120}
          height={120}
          className="mx-auto mb-4 w-[120px] h-[120px] rounded-full"
          priority
        />
        <p className="text-gold text-xs uppercase tracking-widest mb-1">
          Mundial FIFA 2026
        </p>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Puras Cinderelas
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          {STATUS_MESSAGES[competition.status] ?? competition.status}
        </p>
        {isRunningOrAfter && (
          <div className="mt-2">
            <SyncIndicator lastSyncedAt={competition.last_synced_at} />
          </div>
        )}
      </header>

      {rankings.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center">
          Ainda não há classificação disponível.
        </p>
      ) : (
        <RankingTable rankings={rankings} isLocked={isLocked} />
      )}
    </div>
  )
}
