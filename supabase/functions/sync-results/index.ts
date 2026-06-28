import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default
  ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FOOTBALL_DATA_API_KEY = Deno.env.get('FOOTBALL_DATA_API_KEY')!
const SYNC_SECRET = Deno.env.get('SYNC_SECRET')!

// football-data.org stage → stage_reached when eliminated here
const FD_STAGE_MAP: Record<string, string> = {
  LAST_32: 'r32',
  LAST_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  FINAL: 'final',
}

// winner of this round advances to:
const FD_WINNER_ADVANCES_TO: Record<string, string> = {
  LAST_32: 'r16',
  LAST_16: 'qf',
  QUARTER_FINALS: 'sf',
  SEMI_FINALS: 'final',
  FINAL: 'champion',
}

const WORLD_CUP_2026_GROUP_COUNT = 12
const FIXTURES_PER_GROUP = 6

type TeamStats = {
  group_wins: number
  group_draws: number
  stage_reached: string
  is_champion: boolean
}

type MatchRow = {
  stage: string
  status: string
  group: string | null
  homeTeam: { id: number | null } | null
  awayTeam: { id: number | null } | null
  score: {
    winner: string | null
    fullTime?: { home: number | null; away: number | null }
  }
}

type GroupStanding = {
  teamId: string
  points: number
  goalDifference: number
  goalsFor: number
}

function compareStandings(a: GroupStanding, b: GroupStanding) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor
  )
}

function applyGroupQualification(
  teamStats: Map<string, TeamStats>,
  matches: MatchRow[],
  teamMap: Map<number, { id: string; pot: number }>,
) {
  const groupMatches = matches.filter(match => match.stage === 'GROUP_STAGE')
  if (groupMatches.length === 0) return

  if (
    groupMatches.some(match => {
      const homeScore = match.score?.fullTime?.home
      const awayScore = match.score?.fullTime?.away
      const homeApiId = match.homeTeam?.id
      const awayApiId = match.awayTeam?.id
      return (
        match.status !== 'FINISHED' ||
        homeScore == null ||
        awayScore == null ||
        !homeApiId ||
        !awayApiId ||
        !teamMap.has(homeApiId) ||
        !teamMap.has(awayApiId)
      )
    })
  ) {
    return
  }

  const groups = Array.from(
    new Set(groupMatches.map(match => match.group).filter((group): group is string => Boolean(group))),
  )
  if (groups.length < WORLD_CUP_2026_GROUP_COUNT) return
  if (
    groups.some(
      group => groupMatches.filter(match => match.group === group).length < FIXTURES_PER_GROUP,
    )
  ) {
    return
  }

  const qualified = new Set<string>()
  const thirdPlaced: GroupStanding[] = []

  for (const group of groups) {
    const standings = new Map<string, GroupStanding>()
    const ensure = (teamId: string) => {
      if (!standings.has(teamId)) {
        standings.set(teamId, { teamId, points: 0, goalDifference: 0, goalsFor: 0 })
      }
      return standings.get(teamId)!
    }

    for (const match of groupMatches.filter(candidate => candidate.group === group)) {
      const homeDb = teamMap.get(match.homeTeam!.id!)
      const awayDb = teamMap.get(match.awayTeam!.id!)
      const homeScore = match.score.fullTime!.home!
      const awayScore = match.score.fullTime!.away!
      if (!homeDb || !awayDb) continue

      const home = ensure(homeDb.id)
      const away = ensure(awayDb.id)
      home.goalsFor += homeScore
      away.goalsFor += awayScore
      home.goalDifference += homeScore - awayScore
      away.goalDifference += awayScore - homeScore

      if (homeScore > awayScore) home.points += 3
      else if (awayScore > homeScore) away.points += 3
      else {
        home.points++
        away.points++
      }
    }

    const sorted = Array.from(standings.values()).sort(compareStandings)
    for (const standing of sorted.slice(0, 2)) qualified.add(standing.teamId)
    if (sorted[2]) thirdPlaced.push(sorted[2])
  }

  for (const standing of thirdPlaced.sort(compareStandings).slice(0, 8)) {
    qualified.add(standing.teamId)
  }

  for (const teamId of qualified) {
    const stats = teamStats.get(teamId)
    if (stats?.stage_reached === 'group_stage') stats.stage_reached = 'r32'
  }
}

Deno.serve(async (req: Request) => {
  const incomingSecret = req.headers.get('x-sync-secret')
  if (incomingSecret !== SYNC_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

  try {
    const fdRes = await fetch(
      'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
      { headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY } }
    )

    if (!fdRes.ok) {
      return new Response(
        JSON.stringify({ error: `football-data.org error: ${fdRes.status}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const fdData = await fdRes.json()
    const matches: MatchRow[] = fdData.matches ?? []

    const finishedMatches = matches.filter(m => m.status === 'FINISHED')
    if (finishedMatches.length === 0) {
      return new Response(JSON.stringify({ synced: 0, message: 'No finished matches' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: dbTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, api_id, pot')

    if (teamsError || !dbTeams) throw teamsError ?? new Error('Failed to fetch teams')

    const teamMap = new Map<number, { id: string; pot: number }>()
    for (const t of dbTeams) {
      if (t.api_id) teamMap.set(t.api_id, { id: t.id, pot: t.pot })
    }

    // Initialise all teams at group_stage
    const teamStats = new Map<string, TeamStats>()
    for (const t of dbTeams) {
      teamStats.set(t.id, { group_wins: 0, group_draws: 0, stage_reached: 'group_stage', is_champion: false })
    }

    for (const match of finishedMatches) {
      const homeApiId = match.homeTeam?.id
      const awayApiId = match.awayTeam?.id
      const stage = match.stage
      const winner = match.score?.winner ?? null

      const homeDb = homeApiId ? teamMap.get(homeApiId) : null
      const awayDb = awayApiId ? teamMap.get(awayApiId) : null

      if (stage === 'GROUP_STAGE') {
        if (homeDb) {
          const s = teamStats.get(homeDb.id)!
          if (winner === 'HOME_TEAM') s.group_wins++
          else if (winner === 'DRAW') s.group_draws++
        }
        if (awayDb) {
          const s = teamStats.get(awayDb.id)!
          if (winner === 'AWAY_TEAM') s.group_wins++
          else if (winner === 'DRAW') s.group_draws++
        }
      } else if (FD_STAGE_MAP[stage]) {
        const loserStage = FD_STAGE_MAP[stage]
        const winnerStage = FD_WINNER_ADVANCES_TO[stage]

        if (winner === 'HOME_TEAM') {
          if (awayDb) teamStats.get(awayDb.id)!.stage_reached = loserStage
          if (homeDb) {
            const s = teamStats.get(homeDb.id)!
            s.stage_reached = winnerStage
            if (winnerStage === 'champion') s.is_champion = true
          }
        } else if (winner === 'AWAY_TEAM') {
          if (homeDb) teamStats.get(homeDb.id)!.stage_reached = loserStage
          if (awayDb) {
            const s = teamStats.get(awayDb.id)!
            s.stage_reached = winnerStage
            if (winnerStage === 'champion') s.is_champion = true
          }
        }
      }
    }

    applyGroupQualification(teamStats, matches, teamMap)

    const updates = Array.from(teamStats.entries()).map(([teamId, stats]) => ({
      team_id: teamId,
      group_wins: stats.group_wins,
      group_draws: stats.group_draws,
      stage_reached: stats.stage_reached,
      is_champion: stats.is_champion,
      updated_at: new Date().toISOString(),
    }))

    const { error: upsertError } = await supabase
      .from('team_progress')
      .upsert(updates, { onConflict: 'team_id' })

    if (upsertError) throw upsertError

    await supabase
      .from('competition')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', 1)

    return new Response(
      JSON.stringify({ synced: finishedMatches.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('sync-results error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
