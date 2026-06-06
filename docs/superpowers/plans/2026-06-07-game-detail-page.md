# Game Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tappable detail page for each fixture that shows the match header, mascot hero, and (post-lock) which players own the competing teams with current points.

**Architecture:** New nested route `/play/[token]/selections/[fixtureId]` under the existing player layout. Three focused server components (`MatchHeader`, `MascotHero`, `OwnersList`) compose the page. Data comes from two new server actions in `actions/fixtures.ts`. A DB migration adds a `mascot` text column to `teams` and populates all 48 slugs.

**Tech Stack:** Next.js 16 App Router, Supabase (postgres + JS client), Tailwind CSS, TypeScript, `next/image`

---

## File Map

| Action | File |
|---|---|
| Create | `supabase/migrations/004_mascots.sql` |
| Modify | `lib/types.ts` |
| Modify | `actions/fixtures.ts` |
| Create | `components/match-header.tsx` |
| Create | `components/mascot-hero.tsx` |
| Create | `components/owners-list.tsx` |
| Create | `app/play/[token]/selections/[fixtureId]/page.tsx` |
| Modify | `app/play/[token]/selections/page.tsx` |

---

## Task 1: DB migration — add `mascot` column

**Files:**
- Create: `supabase/migrations/004_mascots.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/004_mascots.sql
alter table teams add column mascot text;

-- Pot 1
update teams set mascot = 'alemanha'        where name = 'Alemanha';
update teams set mascot = 'argentina'       where name = 'Argentina';
update teams set mascot = 'belgica'         where name = 'Bélgica';
update teams set mascot = 'brasil'          where name = 'Brasil';
update teams set mascot = 'canada'          where name = 'Canadá';
update teams set mascot = 'espanha'         where name = 'Espanha';
update teams set mascot = 'franca'          where name = 'França';
update teams set mascot = 'inglaterra'      where name = 'Inglaterra';
update teams set mascot = 'mexico'          where name = 'México';
update teams set mascot = 'paises-baixos'   where name = 'Países Baixos';
update teams set mascot = 'portugal'        where name = 'Portugal';
update teams set mascot = 'usa'             where name = 'Estados Unidos';

-- Pot 2
update teams set mascot = 'croacia'         where name = 'Croácia';
update teams set mascot = 'marrocos'        where name = 'Marrocos';
update teams set mascot = 'colombia'        where name = 'Colômbia';
update teams set mascot = 'uruguai'         where name = 'Uruguai';
update teams set mascot = 'suica'           where name = 'Suíça';
update teams set mascot = 'japao'           where name = 'Japão';
update teams set mascot = 'senegal'         where name = 'Senegal';
update teams set mascot = 'irao'            where name = 'Irão';
update teams set mascot = 'coreia_do_sul'   where name = 'Coreia do Sul';
update teams set mascot = 'equador'         where name = 'Equador';
update teams set mascot = 'austria'         where name = 'Áustria';
update teams set mascot = 'australia'       where name = 'Austrália';

-- Pot 3
update teams set mascot = 'noruega'         where name = 'Noruega';
update teams set mascot = 'panama'          where name = 'Panamá';
update teams set mascot = 'egipto'          where name = 'Egito';
update teams set mascot = 'algeria'         where name = 'Argélia';
update teams set mascot = 'escocia'         where name = 'Escócia';
update teams set mascot = 'paraguai'        where name = 'Paraguai';
update teams set mascot = 'tunisia'         where name = 'Tunísia';
update teams set mascot = 'costa_do_marfim' where name = 'Costa do Marfim';
update teams set mascot = 'uzbequistao'     where name = 'Uzbequistão';
update teams set mascot = 'qatar'           where name = 'Qatar';
update teams set mascot = 'arabia_saudita'  where name = 'Arábia Saudita';
update teams set mascot = 'africa_do_sul'   where name = 'África do Sul';

-- Pot 4
update teams set mascot = 'jordania'        where name = 'Jordânia';
update teams set mascot = 'cabo_verde'      where name = 'Cabo Verde';
update teams set mascot = 'gana'            where name = 'Gana';
update teams set mascot = 'curacao'         where name = 'Curaçau';
update teams set mascot = 'haiti'           where name = 'Haiti';
update teams set mascot = 'nova_zelandia'   where name = 'Nova Zelândia';
update teams set mascot = 'bosnia'          where name = 'Bósnia e Herzegovina';
update teams set mascot = 'suecia'          where name = 'Suécia';
update teams set mascot = 'turquia'         where name = 'Turquia';
update teams set mascot = 'chequia'         where name = 'Chéquia';
update teams set mascot = 'congo'           where name = 'República Democrática do Congo';
update teams set mascot = 'iraq'            where name = 'Iraque';
```

- [ ] **Step 2: Push migration to production**

```bash
supabase db push --project-ref vtnwpzdaliqnsmccjaba
```

Expected: `Applying migration 004_mascots.sql...` with no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/004_mascots.sql
git commit -m "feat: add mascot column to teams and populate all 48 slugs"
```

---

## Task 2: Update types and server actions

**Files:**
- Modify: `lib/types.ts`
- Modify: `actions/fixtures.ts`

- [ ] **Step 1: Add `mascot` to the Fixture type in `lib/types.ts`**

Replace the `Fixture` type's team shapes (lines 74–85):

```typescript
export type Fixture = {
  id: string
  api_id: number
  stage: string
  group: string | null
  utc_date: string
  status: string
  home_team: { id: string; name: string; flag_emoji: string; mascot: string | null } | null
  away_team: { id: string; name: string; flag_emoji: string; mascot: string | null } | null
  home_score: number | null
  away_score: number | null
}
```

- [ ] **Step 2: Update `getFixtures` to include `mascot` in `actions/fixtures.ts`**

Replace the select string in `getFixtures`:

```typescript
const { data, error } = await supabase
  .from('fixtures')
  .select(`
    id, api_id, stage, "group", utc_date, status, home_score, away_score,
    home_team:teams!fixtures_home_team_id_fkey ( id, name, flag_emoji, mascot ),
    away_team:teams!fixtures_away_team_id_fkey ( id, name, flag_emoji, mascot )
  `)
  .order('utc_date', { ascending: true })
```

- [ ] **Step 3: Add `getFixtureDetail` to `actions/fixtures.ts`**

Append after `getFixtures`:

```typescript
export async function getFixtureDetail(fixtureId: string): Promise<Fixture | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('fixtures')
    .select(`
      id, api_id, stage, "group", utc_date, status, home_score, away_score,
      home_team:teams!fixtures_home_team_id_fkey ( id, name, flag_emoji, mascot ),
      away_team:teams!fixtures_away_team_id_fkey ( id, name, flag_emoji, mascot )
    `)
    .eq('id', fixtureId)
    .single()

  if (error) return null
  return data as Fixture
}
```

- [ ] **Step 4: Add `getFixtureOwnership` to `actions/fixtures.ts`**

Add this import at the top of the file (after the existing imports):

```typescript
import { getScoreBreakdown } from '@/lib/scoring'
import type { StageReached } from '@/lib/types'
```

Append the function after `getFixtureDetail`:

```typescript
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
```

- [ ] **Step 5: Type-check**

```bash
/usr/local/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts actions/fixtures.ts
git commit -m "feat: add mascot to Fixture type and getFixtureDetail/getFixtureOwnership actions"
```

---

## Task 3: `MatchHeader` component

**Files:**
- Create: `components/match-header.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/match-header.tsx
import type { Fixture } from '@/lib/types'
import { toDisplayDate, toDisplayTime } from '@/lib/fixtures'

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Fase de Grupos',
  LAST_32: '1/16 de Final',
  LAST_16: '1/8 de Final',
  QUARTER_FINALS: 'Quartos de Final',
  SEMI_FINALS: 'Meia-Final',
  FINAL: 'Final',
}

const STATUS_DISPLAY: Record<string, string> = {
  IN_PLAY: 'AO VIVO',
  PAUSED: 'INT',
  LIVE: 'AO VIVO',
  POSTPONED: 'ADI',
  CANCELLED: 'CANC',
}

export function MatchHeader({ fixture }: { fixture: Fixture }) {
  const isFinished = fixture.status === 'FINISHED'
  const isLive = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(fixture.status)

  const centerDisplay = isFinished
    ? `${fixture.home_score ?? '?'} – ${fixture.away_score ?? '?'}`
    : toDisplayTime(fixture.utc_date)

  const statusLabel = isFinished
    ? 'FT'
    : isLive
    ? STATUS_DISPLAY[fixture.status]
    : null

  const stageName = STAGE_LABELS[fixture.stage] ?? fixture.stage
  const group = fixture.group ? ` ${fixture.group}` : ''
  const subLine = `${stageName}${group} · ${toDisplayDate(fixture.utc_date)} · ${toDisplayTime(fixture.utc_date)}`

  return (
    <div className="bg-night-card border border-night-border rounded-xl p-4">
      <div className="flex justify-around items-center mb-2">
        <div className="text-center flex-1">
          <div className="text-4xl">{fixture.home_team?.flag_emoji ?? '?'}</div>
          <div className="text-sm text-foreground mt-1 truncate">{fixture.home_team?.name ?? '—'}</div>
        </div>
        <div className="text-center px-2">
          <div className="text-gold font-bold text-xl tabular-nums">{centerDisplay}</div>
          {statusLabel && (
            <div className="text-xs text-muted-foreground mt-0.5">{statusLabel}</div>
          )}
        </div>
        <div className="text-center flex-1">
          <div className="text-4xl">{fixture.away_team?.flag_emoji ?? '?'}</div>
          <div className="text-sm text-foreground mt-1 truncate">{fixture.away_team?.name ?? '—'}</div>
        </div>
      </div>
      <div className="text-center text-xs text-muted-foreground mt-1">{subLine}</div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
/usr/local/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/match-header.tsx
git commit -m "feat: add MatchHeader component"
```

---

## Task 4: `MascotHero` component

**Files:**
- Create: `components/mascot-hero.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/mascot-hero.tsx
import Image from 'next/image'

type TeamMascot = { slug: string; name: string }

export function MascotHero({
  home,
  away,
}: {
  home: TeamMascot | null
  away: TeamMascot | null
}) {
  const mascots = [home, away].filter(Boolean) as TeamMascot[]
  if (mascots.length === 0) return null

  if (mascots.length === 1) {
    const m = mascots[0]
    return (
      <div className="bg-night-card border border-gold/20 rounded-xl p-4 flex flex-col items-center">
        <Image
          src={`/mascots/${m.slug}.webp`}
          alt={m.name}
          width={200}
          height={200}
        />
        <p className="text-xs text-muted-foreground mt-2">Mascote · {m.name}</p>
      </div>
    )
  }

  // Both mascots — face each other
  return (
    <div className="bg-night-card border border-gold/20 rounded-xl p-4 flex justify-around items-end">
      <div className="text-center">
        <Image
          src={`/mascots/${mascots[0].slug}.webp`}
          alt={mascots[0].name}
          width={160}
          height={160}
          style={{ transform: 'scaleX(-1)' }}
        />
        <p className="text-xs text-muted-foreground mt-2">{mascots[0].name}</p>
      </div>
      <span className="text-muted-foreground text-sm self-center pb-6">vs</span>
      <div className="text-center">
        <Image
          src={`/mascots/${mascots[1].slug}.webp`}
          alt={mascots[1].name}
          width={160}
          height={160}
        />
        <p className="text-xs text-muted-foreground mt-2">{mascots[1].name}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
/usr/local/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/mascot-hero.tsx
git commit -m "feat: add MascotHero component (0/1/2 mascot states)"
```

---

## Task 5: `OwnersList` component

**Files:**
- Create: `components/owners-list.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/owners-list.tsx
import type { PlayerOwnership } from '@/actions/fixtures'

export function OwnersList({
  ownership,
  currentPlayerId,
}: {
  ownership: PlayerOwnership[]
  currentPlayerId: string
}) {
  const sorted = [...ownership].sort((a, b) => {
    if (a.team && !b.team) return -1
    if (!a.team && b.team) return 1
    return a.player.name.localeCompare(b.player.name)
  })

  return (
    <div className="bg-night-card border border-night-border rounded-xl p-4">
      <p className="text-gold text-xs uppercase tracking-widest mb-3">
        Quem tem estas equipas
      </p>
      <div className="space-y-2">
        {sorted.map(({ player, team, points }) => {
          const isMe = player.id === currentPlayerId
          return (
            <div
              key={player.id}
              className="flex items-center justify-between text-sm"
            >
              <span
                className={
                  isMe
                    ? 'font-semibold text-foreground'
                    : team
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }
              >
                {player.name}
              </span>
              {team ? (
                <div className="text-right">
                  <div className="text-gold text-xs">
                    {team.flag_emoji} {team.name}
                  </div>
                  <div className="text-muted-foreground text-xs">{points} pts</div>
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">— sem equipa</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
/usr/local/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/owners-list.tsx
git commit -m "feat: add OwnersList component"
```

---

## Task 6: Detail page

**Files:**
- Create: `app/play/[token]/selections/[fixtureId]/page.tsx`

- [ ] **Step 1: Create the directory and page**

```typescript
// app/play/[token]/selections/[fixtureId]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlayerByToken } from '@/actions/players'
import { getFixtureDetail, getFixtureOwnership } from '@/actions/fixtures'
import { getCompetition } from '@/actions/competition'
import { MatchHeader } from '@/components/match-header'
import { MascotHero } from '@/components/mascot-hero'
import { OwnersList } from '@/components/owners-list'

export default async function FixtureDetailPage({
  params,
}: {
  params: Promise<{ token: string; fixtureId: string }>
}) {
  const { token, fixtureId } = await params

  const [player, fixture, competition] = await Promise.all([
    getPlayerByToken(token),
    getFixtureDetail(fixtureId),
    getCompetition(),
  ])

  if (!player) notFound()
  if (!fixture) notFound()

  const isLocked = ['locked', 'running', 'finished'].includes(competition.status)

  const ownership = isLocked
    ? await getFixtureOwnership(
        fixture.home_team?.id ?? null,
        fixture.away_team?.id ?? null,
      )
    : null

  const homeMascot = fixture.home_team?.mascot
    ? { slug: fixture.home_team.mascot, name: fixture.home_team.name }
    : null

  const awayMascot = fixture.away_team?.mascot
    ? { slug: fixture.away_team.mascot, name: fixture.away_team.name }
    : null

  return (
    <div className="py-4 space-y-4">
      <Link
        href={`/play/${token}/selections`}
        className="text-gold text-sm flex items-center gap-1 hover:text-gold-light transition-colors"
      >
        ← Jogos
      </Link>

      <MatchHeader fixture={fixture} />

      <MascotHero home={homeMascot} away={awayMascot} />

      {isLocked && ownership && (
        <OwnersList ownership={ownership} currentPlayerId={player.id} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
/usr/local/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/play/[token]/selections/[fixtureId]/page.tsx"
git commit -m "feat: add fixture detail page"
```

---

## Task 7: Make calendar rows tappable

**Files:**
- Modify: `app/play/[token]/selections/page.tsx`

- [ ] **Step 1: Add `Link` import**

Add to the imports at the top of `app/play/[token]/selections/page.tsx`:

```typescript
import Link from 'next/link'
```

- [ ] **Step 2: Wrap each fixture row in a Link**

Replace the `<div key={fixture.id} className={...}>` opening tag and its closing `</div>` with a `<Link>`. The full row becomes:

```tsx
<Link
  key={fixture.id}
  href={`/play/${token}/selections/${fixture.id}`}
  className={`flex items-center gap-2 px-3 py-2 rounded border text-sm active:opacity-70 transition-opacity ${
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
      ? `${fixture.home_score ?? '?'} – ${fixture.away_score ?? '?'}`
      : isLive
      ? STATUS_DISPLAY[fixture.status]
      : STATUS_DISPLAY[fixture.status] ?? toDisplayTime(fixture.utc_date)}
  </span>
  <span className="text-foreground flex-1 truncate text-right">
    {fixture.away_team?.name ?? '—'}
  </span>
  <span className="text-base w-6 text-center">
    {fixture.away_team?.flag_emoji ?? '?'}
  </span>
</Link>
```

- [ ] **Step 3: Type-check**

```bash
/usr/local/bin/node node_modules/.bin/tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: no output.

- [ ] **Step 4: Commit and push**

```bash
git add "app/play/[token]/selections/page.tsx"
git commit -m "feat: make fixture rows tappable links to detail page"
git push
```
