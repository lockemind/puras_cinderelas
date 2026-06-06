'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Competition, CompetitionStatus } from '@/lib/types'

const STATUS_FLOW: Record<CompetitionStatus, CompetitionStatus | null> = {
  setup: 'draft',
  draft: 'locked',
  locked: 'running',
  running: 'finished',
  finished: null,
}

export async function advanceStatus() {
  const supabase = createAdminClient()

  const { data: competition, error: fetchError } = await supabase
    .from('competition')
    .select('status')
    .eq('id', 1)
    .single()

  if (fetchError || !competition) throw new Error('Could not fetch competition')

  const next = STATUS_FLOW[competition.status as CompetitionStatus]
  if (!next) throw new Error('Competition is already finished')

  const { error } = await supabase
    .from('competition')
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) throw error

  revalidatePath('/', 'layout')
}

export async function getCompetition(): Promise<Competition> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('competition')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) throw error
  return data as Competition
}
