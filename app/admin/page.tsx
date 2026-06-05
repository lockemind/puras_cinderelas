export const dynamic = 'force-dynamic'

import { getCompetition } from '@/actions/competition'
import { getAllPlayers } from '@/actions/players'
import { getAllTeamsWithProgress } from '@/actions/results'
import { getPot1Assignments } from '@/actions/draft'
import { CompetitionControls } from '@/components/admin/competition-controls'
import { PlayersManager } from '@/components/admin/players-manager'
import { Pot1Assignment } from '@/components/admin/pot1-assignment'
import { ResultsEditor } from '@/components/admin/results-editor'

export default async function AdminPage() {
  const [competition, players, teams, pot1Assignments] = await Promise.all([
    getCompetition(),
    getAllPlayers(),
    getAllTeamsWithProgress(),
    getPot1Assignments(),
  ])

  const pot1Teams = (teams ?? [])
    .filter(t => t.pot === 1)
    .map(t => ({ id: t.id, name: t.name, flag_emoji: t.flag_emoji }))

  return (
    <div className="space-y-6">
      <CompetitionControls competition={competition} />
      <PlayersManager players={players} />
      {competition.status === 'draft' && (
        <Pot1Assignment
          players={players}
          pot1Teams={pot1Teams}
          assignments={pot1Assignments}
        />
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
