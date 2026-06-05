export const dynamic = 'force-dynamic'

import { getCompetition } from '@/actions/competition'
import { getAllPlayers } from '@/actions/players'
import { getAllTeamsWithProgress } from '@/actions/results'
import { createAdminClient } from '@/lib/supabase/admin'
import { CompetitionControls } from '@/components/admin/competition-controls'
import { PlayersManager } from '@/components/admin/players-manager'
import { DrawButton } from '@/components/admin/draw-button'
import { ResultsEditor } from '@/components/admin/results-editor'

async function getDrawDone() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('player_teams')
    .select('id')
    .eq('pot', 1)
    .limit(1)
  return (data?.length ?? 0) > 0
}

export default async function AdminPage() {
  const [competition, players, teams, drawDone] = await Promise.all([
    getCompetition(),
    getAllPlayers(),
    getAllTeamsWithProgress(),
    getDrawDone(),
  ])

  return (
    <div className="space-y-6">
      <CompetitionControls competition={competition} />
      <PlayersManager players={players} />
      {competition.status === 'draft' && (
        <DrawButton drawDone={drawDone} />
      )}
      {(['locked', 'running', 'finished'] as const).includes(
        competition.status as 'locked' | 'running' | 'finished'
      ) && (
        <ResultsEditor
          teams={teams as Parameters<typeof ResultsEditor>[0]['teams']}
          lastSyncedAt={competition.last_synced_at}
        />
      )}
    </div>
  )
}
