import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default
  ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FOOTBALL_DATA_API_KEY = Deno.env.get('FOOTBALL_DATA_API_KEY')!
const SYNC_SECRET = Deno.env.get('SYNC_SECRET')!

// Maps football-data.org English team names → our Portuguese DB names
const API_NAME_TO_PORTUGUESE: Record<string, string> = {
  'Algeria': 'Argélia',
  'Argentina': 'Argentina',
  'Australia': 'Austrália',
  'Austria': 'Áustria',
  'Belgium': 'Bélgica',
  'Bosnia and Herzegovina': 'Bósnia e Herzegovina',
  'Bosnia-Herzegovina': 'Bósnia e Herzegovina',
  'Brazil': 'Brasil',
  'Cabo Verde': 'Cabo Verde',
  'Canada': 'Canadá',
  'Cape Verde': 'Cabo Verde',
  'Cape Verde Islands': 'Cabo Verde',
  'Colombia': 'Colômbia',
  'Congo DR': 'República Democrática do Congo',
  'Croatia': 'Croácia',
  'Curaçao': 'Curaçau',
  'Czech Republic': 'Chéquia',
  'Czechia': 'Chéquia',
  "Côte d'Ivoire": 'Costa do Marfim',
  'DR Congo': 'República Democrática do Congo',
  'Ecuador': 'Equador',
  'Egypt': 'Egito',
  'England': 'Inglaterra',
  'France': 'França',
  'Germany': 'Alemanha',
  'Ghana': 'Gana',
  'Haiti': 'Haiti',
  'IR Iran': 'Irão',
  'Iran': 'Irão',
  'Iraq': 'Iraque',
  'Ivory Coast': 'Costa do Marfim',
  'Japan': 'Japão',
  'Jordan': 'Jordânia',
  'Korea Republic': 'Coreia do Sul',
  'Mexico': 'México',
  'Morocco': 'Marrocos',
  'Netherlands': 'Países Baixos',
  'New Zealand': 'Nova Zelândia',
  'Norway': 'Noruega',
  'Panama': 'Panamá',
  'Paraguay': 'Paraguai',
  'Portugal': 'Portugal',
  'Qatar': 'Qatar',
  'Saudi Arabia': 'Arábia Saudita',
  'Scotland': 'Escócia',
  'Senegal': 'Senegal',
  'South Africa': 'África do Sul',
  'South Korea': 'Coreia do Sul',
  'Spain': 'Espanha',
  'Sweden': 'Suécia',
  'Switzerland': 'Suíça',
  'Tunisia': 'Tunísia',
  'Turkey': 'Turquia',
  'Türkiye': 'Turquia',
  'USA': 'Estados Unidos',
  'United States': 'Estados Unidos',
  'Uruguay': 'Uruguai',
  'Uzbekistan': 'Uzbequistão',
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
    const matches: Array<{
      id: number
      stage: string
      group: string | null
      utcDate: string
      status: string
      homeTeam: { id: number; name: string }
      awayTeam: { id: number; name: string }
      score: { fullTime: { home: number | null; away: number | null } }
    }> = fdData.matches ?? []

    // Collect unique teams seen in the API response
    const apiTeams = new Map<number, string>() // api_id → English name
    for (const m of matches) {
      if (m.homeTeam?.id && m.homeTeam?.name) apiTeams.set(m.homeTeam.id, m.homeTeam.name)
      if (m.awayTeam?.id && m.awayTeam?.name) apiTeams.set(m.awayTeam.id, m.awayTeam.name)
    }

    // Fetch all teams from DB
    const { data: dbTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, api_id, name')

    if (teamsError || !dbTeams) throw teamsError ?? new Error('Failed to fetch teams')

    const teamByApiId = new Map<number, string>() // api_id → internal UUID
    const teamByPortugueseName = new Map<string, string>() // portuguese name → internal UUID

    for (const t of dbTeams) {
      if (t.api_id) teamByApiId.set(t.api_id, t.id)
      teamByPortugueseName.set(t.name, t.id)
    }

    // For any API team not yet linked, find the matching DB team by name and update its api_id
    const updatePromises: Promise<unknown>[] = []
    for (const [apiId, apiName] of apiTeams) {
      if (teamByApiId.has(apiId)) continue

      const portugueseName = API_NAME_TO_PORTUGUESE[apiName]
      if (!portugueseName) continue

      const internalId = teamByPortugueseName.get(portugueseName)
      if (!internalId) continue

      teamByApiId.set(apiId, internalId)
      updatePromises.push(
        supabase.from('teams').update({ api_id: apiId }).eq('id', internalId)
      )
    }

    if (updatePromises.length > 0) await Promise.all(updatePromises)

    const upserts = matches.map(m => ({
      api_id: m.id,
      stage: m.stage,
      group: m.group ?? null,
      utc_date: m.utcDate,
      status: m.status,
      home_team_id: m.homeTeam?.id ? (teamByApiId.get(m.homeTeam.id) ?? null) : null,
      away_team_id: m.awayTeam?.id ? (teamByApiId.get(m.awayTeam.id) ?? null) : null,
      home_score: m.score?.fullTime?.home ?? null,
      away_score: m.score?.fullTime?.away ?? null,
      updated_at: new Date().toISOString(),
    }))

    const { error: upsertError } = await supabase
      .from('fixtures')
      .upsert(upserts, { onConflict: 'api_id' })

    if (upsertError) throw upsertError

    return new Response(
      JSON.stringify({ synced: upserts.length, teamsLinked: updatePromises.length }),
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
