'use server'

import { cache } from 'react'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createPlayer(name: string) {
  if (!name.trim()) throw new Error('Nome é obrigatório')

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('players')
    .insert({ name: name.trim() })

  if (error) throw error

  revalidatePath('/admin')
}

export async function getAllPlayers() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
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
