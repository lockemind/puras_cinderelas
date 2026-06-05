import { notFound } from 'next/navigation'
import { getPlayerByToken } from '@/actions/players'
import { getRankings } from '@/actions/results'
import { getCompetition } from '@/actions/competition'
import { RankingTable } from '@/components/ranking-table'
import { SyncIndicator } from '@/components/sync-indicator'

export default async function RankingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const player = await getPlayerByToken(token)
  if (!player) notFound()

  const [rankings, competition] = await Promise.all([
    getRankings(),
    getCompetition(),
  ])

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground font-semibold">Classificação</h2>
        <SyncIndicator lastSyncedAt={competition.last_synced_at} />
      </div>
      {rankings.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          Classificação disponível assim que o torneio começar.
        </p>
      ) : (
        <RankingTable rankings={rankings} expandedId={player.id} />
      )}
    </div>
  )
}
