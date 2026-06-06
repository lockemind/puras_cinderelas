'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getScoreBreakdown } from '@/lib/scoring'
import type { StageReached } from '@/lib/types'

export type UpdateTeamProgressInput = {
  teamId: string
  groupWins: number
  groupDraws: number
  stageReached: StageReached
  isChampion: boolean
}

export async function updateTeamProgress(input: UpdateTeamProgressInput) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('team_progress')
    .update({
      group_wins: input.groupWins,
      group_draws: input.groupDraws,
      stage_reached: input.stageReached,
      is_champion: input.isChampion,
      updated_at: new Date().toISOString(),
    })
    .eq('team_id', input.teamId)

  if (error) throw error

  revalidatePath('/', 'layout')
}

export async function triggerManualSync() {
  const syncSecret = process.env.SYNC_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!syncSecret || !supabaseUrl) {
    throw new Error('Missing SYNC_SECRET or SUPABASE_URL env vars')
  }

  const functionUrl = `${supabaseUrl}/functions/v1/sync-results`

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-secret': syncSecret,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Sync failed: ${response.status} — ${text}`)
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function getAllTeamsWithProgress() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('teams')
    .select(`
      id, name, pot, flag_emoji,
      team_progress (
        group_wins, group_draws, stage_reached, is_champion, updated_at
      )
    `)
    .order('pot', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function getRankings() {
  const supabase = createAdminClient()

  const { data: players, error: pErr } = await supabase
    .from('players')
    .select('id, name, access_token')
    .order('name', { ascending: true })

  if (pErr || !players) throw pErr ?? new Error('Could not fetch players')

  const { data: playerTeams, error: ptErr } = await supabase
    .from('player_teams')
    .select(`
      player_id, pot,
      teams (
        id, name, pot, flag_emoji,
        team_progress ( group_wins, group_draws, stage_reached, is_champion )
      )
    `)

  if (ptErr) throw ptErr

  const ranked = players.map(player => {
    const myTeams = (playerTeams ?? []).filter(pt => pt.player_id === player.id)

    const teamsWithScores = myTeams.map(pt => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const team = pt.teams as any
      const progress = team?.team_progress ?? {
        group_wins: 0, group_draws: 0, stage_reached: 'group_stage' as StageReached, is_champion: false,
      }
      const breakdown = getScoreBreakdown(progress, pt.pot)
      return {
        team: { id: team.id, name: team.name, pot: team.pot, flag_emoji: team.flag_emoji },
        pot: pt.pot,
        progress,
        breakdown,
      }
    })

    const totalScore = teamsWithScores.reduce((s, t) => s + t.breakdown.total, 0)
    return { player, teams: teamsWithScores, totalScore }
  })

  // Sort: total DESC, then tiebreakers
  ranked.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    const stages = ['champion', 'final', 'sf', 'qf'] as StageReached[]
    for (const stage of stages) {
      const countA = a.teams.filter(t => {
        const order = ['group_stage','r32','r16','qf','sf','final','champion']
        return order.indexOf(t.progress.stage_reached) >= order.indexOf(stage)
      }).length
      const countB = b.teams.filter(t => {
        const order = ['group_stage','r32','r16','qf','sf','final','champion']
        return order.indexOf(t.progress.stage_reached) >= order.indexOf(stage)
      }).length
      if (countB !== countA) return countB - countA
    }
    return 0
  })

  return ranked
}
