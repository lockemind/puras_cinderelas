# Jogos Tab & Team Standings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Selecções" tab with a fixtures calendar ("Jogos"), and move the all-teams standings view into the ranking page as a second tab.

**Architecture:** Fixtures are stored in a new Supabase `fixtures` table populated by a new `sync-fixtures` edge function (same pattern as `sync-results`). The Jogos page is a server component that groups fixtures by date and highlights the player's own teams. The ranking page gains a client-side toggle between player rankings and team standings (the data that used to live in Selecções).

**Tech Stack:** Next.js 16 (server components + server actions), Supabase (Postgres + Edge Functions/Deno), football-data.org v4 API, Tailwind CSS, Vitest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/003_fixtures.sql` | Create | `fixtures` table |
| `supabase/functions/sync-fixtures/index.ts` | Create | Deno edge function to sync fixtures from football-data.org |
| `lib/types.ts` | Modify | Add `Fixture` type |
| `lib/fixtures.ts` | Create | Pure helper: `groupFixturesByDate` |
| `lib/__tests__/fixtures.test.ts` | Create | Tests for `groupFixturesByDate` |
| `actions/fixtures.ts` | Create | `getFixtures()`, `triggerFixturesSync()` server actions |
| `components/admin/competition-controls.tsx` | Modify | Add "Sync Fixtures" button |
| `app/play/[token]/selections/page.tsx` | Rewrite | Becomes the Jogos fixtures page |
| `app/play/[token]/layout.tsx` | Modify | Change tab label to "Jogos" and icon to 📅 |
| `components/team-standings.tsx` | Create | Teams-by-pot standings view (extracted from old Selecções) |
| `components/standings-toggle.tsx` | Create | Client component: tab toggle between rankings and team standings |
| `app/play/[token]/ranking/page.tsx` | Modify | Fetch teams data too; pass both to `<StandingsToggle>` |

---

### Task 1: DB migration — fixtures table

**Files:**
- Create: `supabase/migrations/003_fixtures.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/003_fixtures.sql

create table fixtures (
  id uuid primary key default gen_random_uuid(),
  api_id integer unique not null,
  stage text not null,
  "group" text,
  utc_date timestamptz not null,
  status text not null,
  home_team_id uuid references teams(id) on delete set null,
  away_team_id uuid references teams(id) on delete set null,
  home_score integer,
  away_score integer,
  updated_at timestamptz not null default now()
);

alter table fixtures disable row level security;
```

- [ ] **Step 2: Apply migration to remote Supabase**

```bash
npx supabase db push
```

Expected: migration applied without error. If `supabase db push` is unavailable, run the SQL directly in the Supabase dashboard SQL editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_fixtures.sql
git commit -m "feat: add fixtures table migration"
```

---

### Task 2: Add `Fixture` type

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the type at the end of `lib/types.ts`**

```ts
export type Fixture = {
  id: string
  api_id: number
  stage: string
  group: string | null
  utc_date: string          // ISO string from Supabase
  status: string            // SCHEDULED | LIVE | IN_PLAY | PAUSED | FINISHED | POSTPONED | CANCELLED
  home_team: { id: string; name: string; flag_emoji: string } | null
  away_team: { id: string; name: string; flag_emoji: string } | null
  home_score: number | null
  away_score: number | null
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add Fixture type"
```

---

### Task 3: Fixture grouping helper (TDD)

**Files:**
- Create: `lib/fixtures.ts`
- Create: `lib/__tests__/fixtures.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/fixtures.test.ts
import { describe, it, expect } from 'vitest'
import { groupFixturesByDate } from '../fixtures'
import type { Fixture } from '../types'

const mkFixture = (overrides: Partial<Fixture> & { utc_date: string }): Fixture => ({
  id: 'f1',
  api_id: 1,
  stage: 'GROUP_STAGE',
  group: 'Group A',
  status: 'SCHEDULED',
  home_team: { id: 't1', name: 'Portugal', flag_emoji: '🇵🇹' },
  away_team: { id: 't2', name: 'Spain', flag_emoji: '🇪🇸' },
  home_score: null,
  away_score: null,
  ...overrides,
})

describe('groupFixturesByDate', () => {
  it('groups fixtures by Lisbon date', () => {
    const fixtures = [
      mkFixture({ id: 'f1', utc_date: '2026-06-12T19:00:00Z' }), // 20:00 Lisbon
      mkFixture({ id: 'f2', utc_date: '2026-06-12T21:00:00Z' }), // 22:00 Lisbon — same date
      mkFixture({ id: 'f3', utc_date: '2026-06-13T16:00:00Z' }), // 17:00 Lisbon — next date
    ]
    const groups = groupFixturesByDate(fixtures)
    expect(groups).toHaveLength(2)
    expect(groups[0].fixtures).toHaveLength(2)
    expect(groups[1].fixtures).toHaveLength(1)
  })

  it('returns groups ordered chronologically', () => {
    const fixtures = [
      mkFixture({ id: 'f1', utc_date: '2026-06-13T16:00:00Z' }),
      mkFixture({ id: 'f2', utc_date: '2026-06-12T19:00:00Z' }),
    ]
    const groups = groupFixturesByDate(fixtures)
    expect(new Date(groups[0].fixtures[0].utc_date) < new Date(groups[1].fixtures[0].utc_date)).toBe(true)
  })

  it('returns empty array for no fixtures', () => {
    expect(groupFixturesByDate([])).toEqual([])
  })

  it('includes a human-readable label for each group', () => {
    const fixtures = [mkFixture({ utc_date: '2026-06-12T19:00:00Z' })]
    const groups = groupFixturesByDate(fixtures)
    expect(typeof groups[0].label).toBe('string')
    expect(groups[0].label.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- fixtures
```

Expected: FAIL — `groupFixturesByDate` not found.

- [ ] **Step 3: Implement `groupFixturesByDate` in `lib/fixtures.ts`**

```ts
import type { Fixture } from './types'

const LISBON_TZ = 'Europe/Lisbon'

function toDateKey(utcDate: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: LISBON_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(utcDate))
}

export function toDisplayTime(utcDate: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: LISBON_TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(utcDate))
}

export function toDisplayDate(utcDate: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: LISBON_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(utcDate))
}

export type FixtureGroup = {
  label: string
  dateKey: string
  fixtures: Fixture[]
}

export function groupFixturesByDate(fixtures: Fixture[]): FixtureGroup[] {
  const sorted = [...fixtures].sort(
    (a, b) => new Date(a.utc_date).getTime() - new Date(b.utc_date).getTime()
  )

  const map = new Map<string, FixtureGroup>()

  for (const fixture of sorted) {
    const key = toDateKey(fixture.utc_date)
    if (!map.has(key)) {
      map.set(key, {
        label: toDisplayDate(fixture.utc_date),
        dateKey: key,
        fixtures: [],
      })
    }
    map.get(key)!.fixtures.push(fixture)
  }

  return Array.from(map.values())
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- fixtures
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/fixtures.ts lib/__tests__/fixtures.test.ts
git commit -m "feat: add groupFixturesByDate helper with tests"
```

---

### Task 4: Supabase Edge Function — sync-fixtures

**Files:**
- Create: `supabase/functions/sync-fixtures/index.ts`

- [ ] **Step 1: Create the edge function**

```ts
// supabase/functions/sync-fixtures/index.ts
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
```

- [ ] **Step 2: Deploy the function**

```bash
npx supabase functions deploy sync-fixtures
```

Expected: function deployed. If CLI auth fails, deploy manually via Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/sync-fixtures/index.ts
git commit -m "feat: add sync-fixtures Supabase edge function"
```

---

### Task 5: Server action — `actions/fixtures.ts`

**Files:**
- Create: `actions/fixtures.ts`

- [ ] **Step 1: Create the actions file**

```ts
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

  return (data ?? []) as unknown as Fixture[]
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
```

- [ ] **Step 2: Commit**

```bash
git add actions/fixtures.ts
git commit -m "feat: add getFixtures and triggerFixturesSync server actions"
```

---

### Task 6: Admin — add "Sync Fixtures" button

**Files:**
- Modify: `components/admin/competition-controls.tsx`

- [ ] **Step 1: Add the sync fixtures button**

Add `triggerFixturesSync` import and a new button to `CompetitionControls`. The full updated file:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { advanceStatus } from '@/actions/competition'
import { triggerFixturesSync } from '@/actions/fixtures'
import type { Competition } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  setup: 'Configuração',
  draft: 'Sorteio / Draft',
  locked: 'Bloqueado',
  running: 'A decorrer',
  finished: 'Terminado',
}

const ADVANCE_LABELS: Record<string, string> = {
  setup: 'Avançar para Draft',
  draft: 'Bloquear escolhas',
  locked: 'Iniciar torneio',
  running: 'Terminar competição',
  finished: '',
}

export function CompetitionControls({
  competition,
}: {
  competition: Competition
}) {
  const [loading, setLoading] = useState(false)
  const [fixturesLoading, setFixturesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdvance() {
    setLoading(true)
    setError(null)
    try {
      await advanceStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function handleSyncFixtures() {
    setFixturesLoading(true)
    setError(null)
    try {
      await triggerFixturesSync()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setFixturesLoading(false)
    }
  }

  const advanceLabel = ADVANCE_LABELS[competition.status]

  return (
    <Card className="bg-night-card border-night-border">
      <CardHeader>
        <CardTitle className="text-gold text-sm uppercase tracking-widest">
          Estado da Competição
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Estado atual:</span>
          <span className="text-foreground font-semibold">
            {STATUS_LABELS[competition.status] ?? competition.status}
          </span>
        </div>
        {advanceLabel && (
          <Button
            onClick={handleAdvance}
            disabled={loading}
            className="bg-gold text-night hover:bg-gold-light font-semibold"
          >
            {loading ? 'A processar...' : advanceLabel}
          </Button>
        )}
        <Button
          onClick={handleSyncFixtures}
          disabled={fixturesLoading}
          variant="outline"
          className="border-night-border text-foreground"
        >
          {fixturesLoading ? 'A sincronizar...' : 'Sync Fixtures'}
        </Button>
        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/competition-controls.tsx
git commit -m "feat: add sync fixtures button to admin competition controls"
```

---

### Task 7: Jogos page (replaces Selecções)

**Files:**
- Rewrite: `app/play/[token]/selections/page.tsx`

- [ ] **Step 1: Rewrite the selections page as Jogos**

```tsx
import { notFound } from 'next/navigation'
import { getPlayerByToken } from '@/actions/players'
import { getPlayerTeams } from '@/actions/draft'
import { getFixtures } from '@/actions/fixtures'
import { groupFixturesByDate, toDisplayTime } from '@/lib/fixtures'

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Fase de Grupos',
  LAST_32: '1/16 de Final',
  LAST_16: '1/8 de Final',
  QUARTER_FINALS: 'Quartos de Final',
  SEMI_FINALS: 'Meia-Final',
  FINAL: 'Final',
}

const STATUS_DISPLAY: Record<string, string> = {
  FINISHED: 'FT',
  IN_PLAY: 'AO VIVO',
  PAUSED: 'INT',
  LIVE: 'AO VIVO',
}

export default async function JogosPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const player = await getPlayerByToken(token)
  if (!player) notFound()

  const [fixtures, myTeams] = await Promise.all([
    getFixtures(),
    getPlayerTeams(player.id),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myTeamIds = new Set((myTeams ?? []).map(pt => (pt.teams as any)?.id).filter(Boolean))

  if (fixtures.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Ainda não há jogos disponíveis. O administrador pode sincronizá-los no painel admin.
      </div>
    )
  }

  const groups = groupFixturesByDate(fixtures)

  return (
    <div className="py-4 space-y-6">
      {groups.map(group => (
        <div key={group.dateKey}>
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.fixtures.map(fixture => {
              const isMyGame =
                (fixture.home_team && myTeamIds.has(fixture.home_team.id)) ||
                (fixture.away_team && myTeamIds.has(fixture.away_team.id))
              const isFinished = fixture.status === 'FINISHED'
              const isLive = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(fixture.status)

              return (
                <div
                  key={fixture.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded border text-sm ${
                    isMyGame
                      ? 'border-gold/40 bg-gold-muted'
                      : 'border-night-border bg-night-card'
                  }`}
                >
                  <span className="text-base w-6 text-center">
                    {fixture.home_team?.flag_emoji ?? '?'}
                  </span>
                  <span className="text-foreground flex-1 truncate">
                    {fixture.home_team?.name ?? '—'}
                  </span>
                  <span className="tabular-nums text-xs font-mono text-center w-14">
                    {isFinished
                      ? `${fixture.home_score} – ${fixture.away_score}`
                      : isLive
                      ? STATUS_DISPLAY[fixture.status]
                      : toDisplayTime(fixture.utc_date)}
                  </span>
                  <span className="text-foreground flex-1 truncate text-right">
                    {fixture.away_team?.name ?? '—'}
                  </span>
                  <span className="text-base w-6 text-center">
                    {fixture.away_team?.flag_emoji ?? '?'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update the nav tab in the layout**

In `app/play/[token]/layout.tsx`, change the Selecções tab:

```tsx
// Before:
<TabLink href={`${base}/selections`} label="Seleções" icon="🌍" />

// After:
<TabLink href={`${base}/selections`} label="Jogos" icon="📅" />
```

(The URL path `/selections` stays the same to avoid breaking any existing links.)

- [ ] **Step 3: Commit**

```bash
git add app/play/[token]/selections/page.tsx app/play/[token]/layout.tsx
git commit -m "feat: replace Selecções tab with Jogos fixtures calendar"
```

---

### Task 8: Team standings component

**Files:**
- Create: `components/team-standings.tsx`

- [ ] **Step 1: Create the component (extracted from old Selecções page)**

```tsx
import type { getAllTeamsWithProgress } from '@/actions/results'
import { getScoreBreakdown } from '@/lib/scoring'
import type { TeamProgress, StageReached } from '@/lib/types'

type Teams = Awaited<ReturnType<typeof getAllTeamsWithProgress>>

const STAGE_LABELS: Record<string, string> = {
  group_stage: 'Fase de Grupos',
  r32: '1/16 de Final',
  r16: '1/8 de Final',
  qf: 'Quartos de Final',
  sf: 'Meia-Final',
  final: 'Final',
  champion: 'Campeão 🏆',
}

export function TeamStandings({ teams }: { teams: Teams }) {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map(pot => (
        <div key={pot}>
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">
            Pote {pot}
          </p>
          <div className="space-y-1">
            {teams
              .filter(t => t.pot === pot)
              .map(team => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const progress: TeamProgress = (team.team_progress as any)?.[0] ?? {
                  team_id: team.id,
                  group_wins: 0,
                  group_draws: 0,
                  stage_reached: 'group_stage' as StageReached,
                  is_champion: false,
                  updated_at: '',
                }
                const breakdown = getScoreBreakdown(progress, pot)
                return (
                  <div
                    key={team.id}
                    className="flex items-center gap-3 px-3 py-2 rounded border border-night-border bg-night-card"
                  >
                    <span className="text-base">{team.flag_emoji}</span>
                    <span className="text-foreground text-sm flex-1 truncate">{team.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {STAGE_LABELS[progress.stage_reached] ?? progress.stage_reached}
                    </span>
                    <span className="text-gold text-xs font-semibold tabular-nums">
                      {breakdown.total} pts
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/team-standings.tsx
git commit -m "feat: add TeamStandings component"
```

---

### Task 9: Standings toggle on ranking page

**Files:**
- Create: `components/standings-toggle.tsx`
- Modify: `app/play/[token]/ranking/page.tsx`

- [ ] **Step 1: Create the client toggle component**

```tsx
// components/standings-toggle.tsx
'use client'

import { useState } from 'react'
import type { getRankings, getAllTeamsWithProgress } from '@/actions/results'
import { RankingTable } from '@/components/ranking-table'
import { TeamStandings } from '@/components/team-standings'

type Props = {
  rankings: Awaited<ReturnType<typeof getRankings>>
  teams: Awaited<ReturnType<typeof getAllTeamsWithProgress>>
  expandedPlayerId: string
}

export function StandingsToggle({ rankings, teams, expandedPlayerId }: Props) {
  const [view, setView] = useState<'players' | 'teams'>('players')

  return (
    <div className="space-y-4">
      <div className="flex rounded border border-night-border overflow-hidden text-sm">
        <button
          onClick={() => setView('players')}
          className={`flex-1 py-2 font-medium transition-colors ${
            view === 'players'
              ? 'bg-gold text-night'
              : 'bg-night-card text-muted-foreground hover:text-foreground'
          }`}
        >
          Jogadores
        </button>
        <button
          onClick={() => setView('teams')}
          className={`flex-1 py-2 font-medium transition-colors ${
            view === 'teams'
              ? 'bg-gold text-night'
              : 'bg-night-card text-muted-foreground hover:text-foreground'
          }`}
        >
          Seleções
        </button>
      </div>

      {view === 'players' ? (
        <RankingTable rankings={rankings} expandedId={expandedPlayerId} />
      ) : (
        <TeamStandings teams={teams} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update the ranking page to use `StandingsToggle`**

Full updated `app/play/[token]/ranking/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { getPlayerByToken } from '@/actions/players'
import { getRankings, getAllTeamsWithProgress } from '@/actions/results'
import { getCompetition } from '@/actions/competition'
import { SyncIndicator } from '@/components/sync-indicator'
import { StandingsToggle } from '@/components/standings-toggle'

export default async function RankingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const player = await getPlayerByToken(token)
  if (!player) notFound()

  const [rankings, teams, competition] = await Promise.all([
    getRankings(),
    getAllTeamsWithProgress(),
    getCompetition(),
  ])

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground font-semibold">Classificação</h2>
        <SyncIndicator lastSyncedAt={competition.last_synced_at} />
      </div>
      {rankings.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          Classificação disponível assim que o torneio começar.
        </p>
      ) : (
        <StandingsToggle
          rankings={rankings}
          teams={teams}
          expandedPlayerId={player.id}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run the full test suite to check for regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/standings-toggle.tsx app/play/[token]/ranking/page.tsx
git commit -m "feat: add Jogadores/Seleções toggle to ranking page"
```

---

## Self-Review

**Spec coverage:**
- ✅ Fixtures table in Supabase
- ✅ Sync edge function follows same auth pattern as sync-results
- ✅ Admin button to trigger sync
- ✅ Jogos page replaces Selecções, groups by date, highlights player's teams
- ✅ Nav tab relabelled "Jogos"
- ✅ Team standings moved to ranking page as a toggle tab
- ✅ All data fetched server-side, toggle is client-side only

**Placeholder scan:** No TBDs or incomplete steps.

**Type consistency:**
- `Fixture` type defined in Task 2, used in Tasks 3, 5, and the helper
- `groupFixturesByDate` returns `FixtureGroup[]`, both defined and consumed in Task 3 and 5
- `getAllTeamsWithProgress` return type used directly via `ReturnType` in Tasks 8 and 9 — no drift possible
