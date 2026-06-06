'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Fixture } from '@/lib/types'

export async function getFixtures(): Promise<Fixture[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      id, api_id, stage, "group", utc_date, status, home_score, away_score,
      home_team:teams!fixtures_home_team_id_fkey ( id, name, flag_emoji ),
      away_team:teams!fixtures_away_team_id_fkey ( id, name, flag_emoji )
    `)
    .order('utc_date', { ascending: true })

  if (error) throw error

  return data ?? []
}

export async function triggerFixturesSync() {
  const syncSecret = process.env.SYNC_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!syncSecret || !supabaseUrl) {
    throw new Error('Missing SYNC_SECRET or SUPABASE_URL env vars')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/sync-fixtures`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-secret': syncSecret,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Fixtures sync failed: ${response.status} — ${text}`)
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
