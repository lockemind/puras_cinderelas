import { notFound } from 'next/navigation'
import { getPlayerByToken } from '@/actions/players'
import { getPlayerTeams } from '@/actions/draft'
import { getCompetition } from '@/actions/competition'
import { getRankingsWithDeltas } from '@/actions/results'
import { getFixtures } from '@/actions/fixtures'
import { createAdminClient } from '@/lib/supabase/admin'
import { ScoreHero } from '@/components/score-hero'
import { TeamCard } from '@/components/team-card'
import { TeamSelector } from '@/components/team-selector'
import { getScoreBreakdown } from '@/lib/scoring'
import { isTeamEliminated } from '@/lib/elimination'
import type { TeamProgress, StageReached } from '@/lib/types'

async function getTeamsByPot(pot: number) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('teams')
    .select('id, name, flag_emoji')
    .eq('pot', pot)
    .order('name', { ascending: true })
  return data ?? []
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const player = await getPlayerByToken(token)
  if (!player) notFound()

  const [competition, myTeams, rankings, fixtures] = await Promise.all([
    getCompetition(),
    getPlayerTeams(player.id),
    getRankingsWithDeltas(),
    getFixtures(),
  ])

  const isDraft = competition.status === 'draft'

  if (isDraft) {
    const pot1Assignment = myTeams?.find(pt => pt.pot === 1)
    const [pot2Teams, pot3Teams, pot4Teams] = await Promise.all([
      getTeamsByPot(2),
      getTeamsByPot(3),
      getTeamsByPot(4),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getChoice = (pot: number) => myTeams?.find(pt => pt.pot === pot)?.teams as any

    return (
      <div className="py-4 space-y-6">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">
            Pote 1 — sorteio
          </p>
          {pot1Assignment ? (
            <div className="flex items-center gap-3 rounded border border-gold/30 bg-gold-muted px-4 py-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <span className="text-2xl">{(pot1Assignment.teams as any).flag_emoji}</span>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <span className="text-gold font-semibold">{(pot1Assignment.teams as any).name}</span>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Aguarda o sorteio do administrador.
            </p>
          )}
        </div>

        <TeamSelector pot={2} teams={pot2Teams} currentTeamId={getChoice(2)?.id ?? null} playerToken={token} />
        <TeamSelector pot={3} teams={pot3Teams} currentTeamId={getChoice(3)?.id ?? null} playerToken={token} />
        <TeamSelector pot={4} teams={pot4Teams} currentTeamId={getChoice(4)?.id ?? null} playerToken={token} />
      </div>
    )
  }

  if (!myTeams || myTeams.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Ainda não foram registadas equipas.
      </div>
    )
  }

  const myEntry = rankings.find(r => r.player.id === player.id)

  return (
    <div className="py-2 space-y-4">
      <ScoreHero
        total={myEntry?.totalScore ?? 0}
        rank={myEntry?.rank ?? null}
        pointsToday={myEntry?.pointsToday ?? null}
      />
      <div className="space-y-2">
        {myTeams
          .sort((a, b) => a.pot - b.pot)
          .map(pt => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const team = pt.teams as any
            const rankingTeam = myEntry?.teams.find(t => t.team.id === team.id)
            const progress: TeamProgress = rankingTeam?.progress
              ? { ...rankingTeam.progress, team_id: team.id, updated_at: '' }
              : (team.team_progress ?? {
                  team_id: team.id,
                  group_wins: 0,
                  group_draws: 0,
                  stage_reached: 'group_stage' as StageReached,
                  is_champion: false,
                  updated_at: '',
                })
            const breakdown = rankingTeam?.breakdown ?? getScoreBreakdown(progress, pt.pot)
            return (
              <TeamCard
                key={pt.id}
                name={team.name}
                flagEmoji={team.flag_emoji}
                mascot={team.mascot ?? null}
                pot={pt.pot}
                progress={progress}
                breakdown={breakdown}
                eliminated={isTeamEliminated(team.id, progress, fixtures)}
              />
            )
          })}
      </div>
    </div>
  )
}
