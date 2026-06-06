'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getScoreBreakdown } from '@/lib/scoring'
import type { Fixture, StageReached } from '@/lib/types'

const FIXTURE_SELECT = `
  id, api_id, stage, "group", utc_date, status, home_score, away_score,
  home_team:teams!fixtures_home_team_id_fkey ( id, name, flag_emoji, mascot ),
  away_team:teams!fixtures_away_team_id_fkey ( id, name, flag_emoji, mascot )
`

export async function getFixtures(): Promise<Fixture[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('fixtures')
    .select(FIXTURE_SELECT)
    .order('utc_date', { ascending: true })

  if (error) throw error

  return (data ?? []) as unknown as Fixture[]
}

export async function getFixtureDetail(fixtureId: string): Promise<Fixture | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('fixtures')
    .select(FIXTURE_SELECT)
    .eq('id', fixtureId)
    .single()

  if (error) return null
  return data as unknown as Fixture
}

export type PlayerOwnership = {
  player: { id: string; name: string }
  team: { id: string; name: string; flag_emoji: string } | null
  pot: number | null
  points: number
}

export async function getFixtureOwnership(
  homeTeamId: string | null,
  awayTeamId: string | null,
): Promise<PlayerOwnership[]> {
  const supabase = createAdminClient()
  const teamIds = [homeTeamId, awayTeamId].filter(Boolean) as string[]

  const [{ data: players }, { data: playerTeams }] = await Promise.all([
    supabase.from('players').select('id, name').order('name'),
    teamIds.length > 0
      ? supabase
          .from('player_teams')
          .select(`
            player_id, pot,
            teams ( id, name, flag_emoji,
              team_progress ( group_wins, group_draws, stage_reached, is_champion )
            )
          `)
          .in('team_id', teamIds)
      : Promise.resolve({ data: [] }),
  ])

  return (players ?? []).map(player => {
    const pt = (playerTeams ?? []).find(pt => pt.player_id === player.id)
    if (!pt) return { player, team: null, pot: null, points: 0 }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const team = pt.teams as any
    const progress = team?.team_progress ?? {
      group_wins: 0,
      group_draws: 0,
      stage_reached: 'group_stage' as StageReached,
      is_champion: false,
    }
    const breakdown = getScoreBreakdown(progress, pt.pot)
    return {
      player,
      team: { id: team.id, name: team.name, flag_emoji: team.flag_emoji },
      pot: pt.pot,
      points: breakdown.total,
    }
  })
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
