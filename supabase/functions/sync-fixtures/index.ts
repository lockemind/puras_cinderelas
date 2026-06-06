import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FOOTBALL_DATA_API_KEY = Deno.env.get('FOOTBALL_DATA_API_KEY')!
const SYNC_SECRET = Deno.env.get('SYNC_SECRET')!

Deno.serve(async (req: Request) => {
  const incomingSecret = req.headers.get('x-sync-secret')
  if (incomingSecret !== SYNC_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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
    const matches: Array<{
      id: number
      stage: string
      group: string | null
      utcDate: string
      status: string
      homeTeam: { id: number }
      awayTeam: { id: number }
      score: { fullTime: { home: number | null; away: number | null } }
    }> = fdData.matches ?? []

    // Build api_id → teams.id lookup
    const { data: dbTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, api_id')

    if (teamsError || !dbTeams) throw teamsError ?? new Error('Failed to fetch teams')

    const teamMap = new Map<number, string>()
    for (const t of dbTeams) {
      if (t.api_id) teamMap.set(t.api_id, t.id)
    }

    const upserts = matches.map(m => ({
      api_id: m.id,
      stage: m.stage,
      group: m.group ?? null,
      utc_date: m.utcDate,
      status: m.status,
      home_team_id: m.homeTeam?.id ? (teamMap.get(m.homeTeam.id) ?? null) : null,
      away_team_id: m.awayTeam?.id ? (teamMap.get(m.awayTeam.id) ?? null) : null,
      home_score: m.score?.fullTime?.home ?? null,
      away_score: m.score?.fullTime?.away ?? null,
      updated_at: new Date().toISOString(),
    }))

    const { error: upsertError } = await supabase
      .from('fixtures')
      .upsert(upserts, { onConflict: 'api_id' })

    if (upsertError) throw upsertError

    return new Response(
      JSON.stringify({ synced: upserts.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('sync-fixtures error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
