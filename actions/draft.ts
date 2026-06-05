'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Admin manually assigns a Pot 1 team to a player.
 * Pass teamId = null to clear the assignment.
 * Multiple players may share the same Pot 1 team.
 */
export async function assignPot1Team(playerId: string, teamId: string | null) {
  const supabase = createAdminClient()

  if (!teamId) {
    await supabase
      .from('player_teams')
      .delete()
      .eq('player_id', playerId)
      .eq('pot', 1)
  } else {
    const { data: team } = await supabase
      .from('teams')
      .select('pot')
      .eq('id', teamId)
      .single()

    if (!team || team.pot !== 1) throw new Error('Equipa não pertence ao Pote 1')

    const { error } = await supabase
      .from('player_teams')
      .upsert(
        { player_id: playerId, team_id: teamId, pot: 1 },
        { onConflict: 'player_id,pot' }
      )
    if (error) throw error
  }

  revalidatePath('/', 'layout')
}

/** Returns all Pot 1 assignments (player_id → team_id). */
export async function getPot1Assignments(): Promise<{ player_id: string; team_id: string }[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('player_teams')
    .select('player_id, team_id')
    .eq('pot', 1)
  return data ?? []
}

export async function chooseTeam(
  playerToken: string,
  teamId: string,
  pot: 2 | 3 | 4
) {
  const supabase = createAdminClient()

  const { data: competition } = await supabase
    .from('competition')
    .select('status')
    .eq('id', 1)
    .single()

  if (competition?.status !== 'draft') {
    throw new Error('As escolhas estão encerradas')
  }

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('access_token', playerToken)
    .single()

  if (!player) throw new Error('Jogador não encontrado')

  const { data: team } = await supabase
    .from('teams')
    .select('pot')
    .eq('id', teamId)
    .single()

  if (!team || team.pot !== pot) {
    throw new Error(`Equipa não pertence ao Pote ${pot}`)
  }

  const { error } = await supabase
    .from('player_teams')
    .upsert(
      { player_id: player.id, team_id: teamId, pot },
      { onConflict: 'player_id,pot' }
    )

  if (error) throw error

  revalidatePath(`/play/${playerToken}`, 'layout')
}

export async function getPlayerTeams(playerId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('player_teams')
    .select(`
      id,
      pot,
      teams (
        id, name, pot, flag_emoji, api_id,
        team_progress (
          group_wins, group_draws, stage_reached, is_champion, updated_at
        )
      )
    `)
    .eq('player_id', playerId)
    .order('pot', { ascending: true })

  if (error) throw error
  return data
}
