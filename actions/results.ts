'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getScoreBreakdown, mergeProgress } from '@/lib/scoring'
import { compareRankingEntries, computeTeamGoalStats, sumGoalStats } from '@/lib/ranking'
import { computeTeamStatsFromFixtures, type ProgressFixtureRow } from '@/lib/team-progress'
import type { StageReached } from '@/lib/types'

async function fetchFixtureRows() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('fixtures')
    .select('stage, "group", status, home_team_id, away_team_id, home_score, away_score')

  return (data ?? []) as ProgressFixtureRow[]
}

export async function fetchLiveStats() {
  return computeTeamStatsFromFixtures(await fetchFixtureRows())
}

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
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!syncSecret || !supabaseUrl || !anonKey) {
    throw new Error('Missing SYNC_SECRET, SUPABASE_URL, or SUPABASE_ANON_KEY env vars')
  }

  const functionUrl = `${supabaseUrl}/functions/v1/sync-results`

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
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
  const [{ data, error }, fixtures] = await Promise.all([
    supabase
      .from('teams')
      .select(`
        id, name, pot, flag_emoji,
        team_progress (
          group_wins, group_draws, stage_reached, is_champion, updated_at
        )
      `)
      .order('pot', { ascending: true })
      .order('name', { ascending: true }),
    fetchFixtureRows(),
  ])

  if (error) throw error

  const liveStats = computeTeamStatsFromFixtures(fixtures)
  const goalStatsByTeam = computeTeamGoalStats(fixtures)

  return (data ?? []).map(team => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (team.team_progress as any) ?? {
      group_wins: 0, group_draws: 0, stage_reached: 'group_stage' as StageReached, is_champion: false, updated_at: '',
    }
    return {
      ...team,
      team_progress: { ...db, ...mergeProgress(db, liveStats.get(team.id)) },
      goalStats: goalStatsByTeam.get(team.id) ?? { gamesPlayed: 0, goalsFor: 0, goalsAgainst: 0 },
    }
  })
}

export async function getRankings() {
  const supabase = createAdminClient()

  const [{ data: players, error: pErr }, { data: playerTeams, error: ptErr }, fixtures] = await Promise.all([
    supabase
      .from('players')
      .select('id, name, access_token, is_guest')
      .eq('is_guest', false)
      .order('name', { ascending: true }),
    supabase
      .from('player_teams')
      .select(`
        player_id, pot,
        teams (
          id, name, pot, flag_emoji, mascot,
          team_progress ( group_wins, group_draws, stage_reached, is_champion )
        )
      `),
    fetchFixtureRows(),
  ])

  if (pErr || !players) throw pErr ?? new Error('Could not fetch players')
  if (ptErr) throw ptErr

  const liveStats = computeTeamStatsFromFixtures(fixtures)
  const goalStatsByTeam = computeTeamGoalStats(fixtures)

  const ranked = players.map(player => {
    const myTeams = (playerTeams ?? []).filter(pt => pt.player_id === player.id)

    const teamsWithScores = myTeams.map(pt => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const team = pt.teams as any
      const dbProgress = team?.team_progress ?? {
        group_wins: 0, group_draws: 0, stage_reached: 'group_stage' as StageReached, is_champion: false,
      }
      const merged = mergeProgress(dbProgress, liveStats.get(team.id))
      const progress = {
        team_id: team.id as string,
        ...merged,
        updated_at: dbProgress.updated_at ?? '',
      }
      const breakdown = getScoreBreakdown(progress, pt.pot)
      const teamGoalStats = goalStatsByTeam.get(team.id) ?? { gamesPlayed: 0, goalsFor: 0, goalsAgainst: 0 }
      return {
        team: { id: team.id, name: team.name, pot: team.pot, flag_emoji: team.flag_emoji, mascot: (team.mascot ?? null) as string | null },
        pot: pt.pot,
        progress,
        breakdown,
        goalStats: teamGoalStats,
      }
    })

    const goalStats = sumGoalStats(teamsWithScores.map(t => t.team.id), goalStatsByTeam)
    const totalScore = teamsWithScores.reduce((s, t) => s + t.breakdown.total, 0)
    return { player, teams: teamsWithScores, totalScore, ...goalStats }
  })

  // Sort: total DESC, then tiebreakers
  ranked.sort(compareRankingEntries)

  return ranked
}

export type RankingEntryWithDelta = Awaited<ReturnType<typeof getRankings>>[number] & {
  rank: number
  rankDelta: number | null
  pointsToday: number | null
}

export async function getRankingsWithDeltas(): Promise<RankingEntryWithDelta[]> {
  const supabase = createAdminClient()
  const rankings = await getRankings()

  const { data: latestRow } = await supabase
    .from('ranking_snapshots')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  let snapByPlayer = new Map<string, { rank: number; points: number }>()
  if (latestRow) {
    const { data: snaps } = await supabase
      .from('ranking_snapshots')
      .select('player_id, rank, points')
      .eq('snapshot_date', latestRow.snapshot_date)
    snapByPlayer = new Map((snaps ?? []).map(s => [s.player_id, s]))
  }

  return rankings.map((entry, idx) => {
    const snap = snapByPlayer.get(entry.player.id)
    return {
      ...entry,
      rank: idx + 1,
      rankDelta: snap ? snap.rank - (idx + 1) : null,
      pointsToday: snap ? entry.totalScore - snap.points : null,
    }
  })
}
