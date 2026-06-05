'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { shuffleAndAssign } from '@/lib/draw-utils'

export async function executeDraw() {
  const supabase = createAdminClient()

  const { data: competition } = await supabase
    .from('competition')
    .select('status')
    .eq('id', 1)
    .single()

  if (competition?.status !== 'draft') {
    throw new Error('O sorteio só pode ser executado no estado "draft"')
  }

  const { data: existing } = await supabase
    .from('player_teams')
    .select('id')
    .eq('pot', 1)
    .limit(1)

  if (existing && existing.length > 0) {
    throw new Error('Sorteio já realizado')
  }

  const { data: players, error: pErr } = await supabase
    .from('players')
    .select('id')

  const { data: pot1Teams, error: tErr } = await supabase
    .from('teams')
    .select('id')
    .eq('pot', 1)

  if (pErr || tErr || !players || !pot1Teams) {
    throw new Error('Erro ao obter jogadores ou equipas')
  }

  if (players.length !== pot1Teams.length) {
    throw new Error(
      `Número de jogadores (${players.length}) deve ser igual ao número de equipas do Pote 1 (${pot1Teams.length})`
    )
  }

  const assignments = shuffleAndAssign(
    players.map(p => p.id),
    pot1Teams.map(t => t.id)
  )

  const { error } = await supabase.from('player_teams').insert(
    assignments.map(({ playerId, teamId }) => ({
      player_id: playerId,
      team_id: teamId,
      pot: 1,
    }))
  )

  if (error) throw error

  revalidatePath('/', 'layout')
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
