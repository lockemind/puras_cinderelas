'use server'

import { cache } from 'react'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

async function assignGuestPortugalTeam(
  supabase: ReturnType<typeof createAdminClient>,
  playerId: string
) {
  const { data: portugal, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('name', 'Portugal')
    .eq('pot', 1)
    .single()

  if (teamError) throw teamError
  if (!portugal) throw new Error('Portugal não encontrado no Pote 1')

  const { error } = await supabase
    .from('player_teams')
    .upsert(
      { player_id: playerId, team_id: portugal.id, pot: 1 },
      { onConflict: 'player_id,pot' }
    )

  if (error) throw error
}

export async function createPlayer(name: string) {
  if (!name.trim()) throw new Error('Nome é obrigatório')

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('players')
    .insert({ name: name.trim(), is_guest: false })

  if (error) throw error

  revalidatePath('/admin')
}

export async function createGuestPlayer(name = 'Convidado') {
  const trimmed = name.trim() || 'Convidado'
  const supabase = createAdminClient()

  const { data: existing, error: fetchError } = await supabase
    .from('players')
    .select('id')
    .eq('is_guest', true)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (existing) {
    const { error } = await supabase
      .from('players')
      .update({ name: trimmed })
      .eq('id', existing.id)

    if (error) throw error
    await assignGuestPortugalTeam(supabase, existing.id)

    revalidatePath('/', 'layout')
    return
  }

  const { data: guest, error } = await supabase
    .from('players')
    .insert({ name: trimmed, is_guest: true })
    .select('id')
    .single()

  if (error) throw error
  await assignGuestPortugalTeam(supabase, guest.id)

  revalidatePath('/admin')
}

export async function getAllPlayers() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('is_guest', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

async function _getPlayerByToken(token: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('access_token', token)
    .single()

  if (error) return null
  return data
}

export const getPlayerByToken = cache(_getPlayerByToken)
