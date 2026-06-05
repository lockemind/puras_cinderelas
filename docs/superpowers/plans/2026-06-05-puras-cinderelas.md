# Puras Cinderelas 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private FIFA 2026 World Cup prediction game web app for 12 participants, with token-based access, an admin panel, automatic score calculation, and auto-sync of results from football-data.org.

**Architecture:** Next.js 14 App Router with React Server Components and Server Actions for all mutations. Supabase (PostgreSQL) as the database, accessed exclusively server-side via the service role key. A Supabase Edge Function syncs results from football-data.org every 30 minutes via pg_cron.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + Edge Functions), Vitest, Vercel, football-data.org API.

---

## File Structure

```
puras_cinderelas/
├── app/
│   ├── layout.tsx                          # Root layout (dark theme, Portuguese)
│   ├── page.tsx                            # Public page: state + rankings
│   ├── globals.css                         # CSS variables + base styles
│   ├── not-found.tsx                       # Global 404
│   ├── play/
│   │   └── [token]/
│   │       ├── layout.tsx                  # Validates token, renders tab bar
│   │       ├── not-found.tsx               # 404 for invalid tokens
│   │       ├── page.tsx                    # Redirects to /play/[token]/team
│   │       ├── team/
│   │       │   └── page.tsx                # "A minha equipa" tab
│   │       ├── ranking/
│   │       │   └── page.tsx                # "Classificação" tab
│   │       └── selections/
│   │           └── page.tsx                # "Seleções" tab
│   └── admin/
│       ├── layout.tsx                      # Admin shell layout
│       └── page.tsx                        # Full admin panel
├── components/
│   ├── ranking-table.tsx                   # Shared leaderboard (public + player)
│   ├── sync-indicator.tsx                  # "Próxima atualização em X min"
│   ├── team-card.tsx                       # Team card with score breakdown
│   ├── team-selector.tsx                   # Team picker (draft mode)
│   └── admin/
│       ├── competition-controls.tsx        # State machine buttons
│       ├── players-manager.tsx             # Create/list players + links
│       ├── draw-button.tsx                 # Pote 1 draw trigger
│       └── results-editor.tsx             # Per-team results form
├── actions/
│   ├── competition.ts                      # advanceStatus()
│   ├── players.ts                          # createPlayer()
│   ├── draft.ts                            # executeDraw(), chooseTeam()
│   └── results.ts                          # updateTeamProgress(), triggerSync()
├── lib/
│   ├── supabase/
│   │   └── admin.ts                        # Service-role Supabase client (server only)
│   ├── scoring.ts                          # Pure scoring calculation functions
│   ├── draw-utils.ts                       # Pure shuffle/assign utility
│   └── types.ts                            # All TypeScript types
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_seed_teams.sql
│   └── functions/
│       └── sync-results/
│           └── index.ts                    # Edge Function
├── middleware.ts                           # Protects /admin routes
└── vitest.config.ts
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json` (replaced), `tsconfig.json`, `vitest.config.ts`, `.env.local`, `.gitignore`

- [ ] **Step 1: Scaffold Next.js app**

Run from `/Users/pamaral/Lab/puras_cinderelas/`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
```
Expected: Next.js project files created. Existing `index.js` and `package.json` are replaced.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js
npm install -D vitest @vitejs/plugin-react jsdom
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init --defaults
```
When prompted, choose: Default style, Neutral base color, CSS variables yes.

Then add required components:
```bash
npx shadcn@latest add button input label table card badge select tabs
```

- [ ] **Step 4: Create vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

- [ ] **Step 5: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Create `.env.local`**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Admin access
ADMIN_SECRET=choose_a_long_random_string_here

# football-data.org
FOOTBALL_DATA_API_KEY=your_football_data_api_key

# Edge Function security
SYNC_SECRET=choose_another_long_random_string_here
```

Fill in values from: Supabase Dashboard → Settings → API. football-data.org key from https://www.football-data.org/client/register.

- [ ] **Step 7: Update `.gitignore`**

Ensure `.env.local` and `.superpowers/` are ignored:
```
# existing entries...
.env.local
.env*.local
.superpowers/
```

- [ ] **Step 8: Verify setup**

```bash
npm run dev
```
Expected: Next.js dev server starts at http://localhost:3000 with default page.

```bash
npm run build
```
Expected: Build completes without errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with shadcn/ui and Vitest"
```

---

## Task 2: Database Schema & Seed Data

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/migrations/002_seed_teams.sql`

- [ ] **Step 1: Create initial schema migration**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Competition singleton (always id = 1)
create table competition (
  id integer primary key default 1 check (id = 1),
  status text not null default 'setup'
    check (status in ('setup', 'draft', 'locked', 'running', 'finished')),
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into competition (id) values (1);

-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  access_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

-- Teams (all 48 World Cup nations)
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pot integer not null check (pot between 1 and 4),
  flag_emoji text not null default '',
  api_id integer,  -- football-data.org numeric team ID
  created_at timestamptz not null default now()
);

-- Team assignments per player (one per pot)
create table player_teams (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  pot integer not null check (pot between 1 and 4),
  unique (player_id, pot)
);

-- Team progress (updated by admin or auto-sync)
create table team_progress (
  team_id uuid primary key references teams(id) on delete cascade,
  group_wins integer not null default 0,
  group_draws integer not null default 0,
  stage_reached text not null default 'group_stage'
    check (stage_reached in ('group_stage', 'r32', 'r16', 'qf', 'sf', 'final', 'champion')),
  is_champion boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Score audit log (optional; populated when scores are recalculated)
create table score_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  reason text not null,
  points integer not null,
  created_at timestamptz not null default now()
);

-- Private app: disable RLS (service role key used server-side only)
alter table competition disable row level security;
alter table players disable row level security;
alter table teams disable row level security;
alter table player_teams disable row level security;
alter table team_progress disable row level security;
alter table score_entries disable row level security;
```

- [ ] **Step 2: Create seed data migration**

Create `supabase/migrations/002_seed_teams.sql`:
```sql
-- Pote 1 (favourites + hosts)
insert into teams (name, pot, flag_emoji) values
  ('Canadá', 1, '🇨🇦'),
  ('México', 1, '🇲🇽'),
  ('Estados Unidos', 1, '🇺🇸'),
  ('Espanha', 1, '🇪🇸'),
  ('Argentina', 1, '🇦🇷'),
  ('França', 1, '🇫🇷'),
  ('Inglaterra', 1, '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
  ('Brasil', 1, '🇧🇷'),
  ('Portugal', 1, '🇵🇹'),
  ('Países Baixos', 1, '🇳🇱'),
  ('Bélgica', 1, '🇧🇪'),
  ('Alemanha', 1, '🇩🇪');

-- Pote 2
insert into teams (name, pot, flag_emoji) values
  ('Croácia', 2, '🇭🇷'),
  ('Marrocos', 2, '🇲🇦'),
  ('Colômbia', 2, '🇨🇴'),
  ('Uruguai', 2, '🇺🇾'),
  ('Suíça', 2, '🇨🇭'),
  ('Japão', 2, '🇯🇵'),
  ('Senegal', 2, '🇸🇳'),
  ('Irão', 2, '🇮🇷'),
  ('Coreia do Sul', 2, '🇰🇷'),
  ('Equador', 2, '🇪🇨'),
  ('Áustria', 2, '🇦🇹'),
  ('Austrália', 2, '🇦🇺');

-- Pote 3
insert into teams (name, pot, flag_emoji) values
  ('Noruega', 3, '🇳🇴'),
  ('Panamá', 3, '🇵🇦'),
  ('Egito', 3, '🇪🇬'),
  ('Argélia', 3, '🇩🇿'),
  ('Escócia', 3, '🏴󠁧󠁢󠁳󠁣󠁴󠁿'),
  ('Paraguai', 3, '🇵🇾'),
  ('Tunísia', 3, '🇹🇳'),
  ('Costa do Marfim', 3, '🇨🇮'),
  ('Uzbequistão', 3, '🇺🇿'),
  ('Qatar', 3, '🇶🇦'),
  ('Arábia Saudita', 3, '🇸🇦'),
  ('África do Sul', 3, '🇿🇦');

-- Pote 4
insert into teams (name, pot, flag_emoji) values
  ('Jordânia', 4, '🇯🇴'),
  ('Cabo Verde', 4, '🇨🇻'),
  ('Gana', 4, '🇬🇭'),
  ('Curaçau', 4, '🇨🇼'),
  ('Haiti', 4, '🇭🇹'),
  ('Nova Zelândia', 4, '🇳🇿'),
  ('Bósnia e Herzegovina', 4, '🇧🇦'),
  ('Suécia', 4, '🇸🇪'),
  ('Turquia', 4, '🇹🇷'),
  ('Chéquia', 4, '🇨🇿'),
  ('República Democrática do Congo', 4, '🇨🇩'),
  ('Iraque', 4, '🇮🇶');

-- Initialise team_progress for all teams
insert into team_progress (team_id)
select id from teams;
```

- [ ] **Step 3: Run migrations in Supabase**

In the Supabase dashboard → SQL Editor, run `001_initial_schema.sql` first, then `002_seed_teams.sql`.

Verify with:
```sql
select count(*) from teams;       -- expect 48
select count(*) from team_progress; -- expect 48
select * from competition;        -- expect 1 row, status = 'setup'
```

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema and seed data"
```

---

## Task 3: TypeScript Types & Supabase Client

**Files:**
- Create: `lib/types.ts`
- Create: `lib/supabase/admin.ts`

- [ ] **Step 1: Create types**

Create `lib/types.ts`:
```typescript
export type CompetitionStatus =
  | 'setup'
  | 'draft'
  | 'locked'
  | 'running'
  | 'finished'

export type StageReached =
  | 'group_stage'
  | 'r32'
  | 'r16'
  | 'qf'
  | 'sf'
  | 'final'
  | 'champion'

export type Competition = {
  id: number
  status: CompetitionStatus
  last_synced_at: string | null
  updated_at: string
}

export type Player = {
  id: string
  name: string
  access_token: string
  created_at: string
}

export type Team = {
  id: string
  name: string
  pot: number
  flag_emoji: string
  api_id: number | null
  created_at: string
}

export type PlayerTeam = {
  id: string
  player_id: string
  team_id: string
  pot: number
}

export type TeamProgress = {
  team_id: string
  group_wins: number
  group_draws: number
  stage_reached: StageReached
  is_champion: boolean
  updated_at: string
}

// Enriched types for UI
export type TeamWithProgress = Team & {
  progress: TeamProgress
}

export type PlayerTeamWithProgress = {
  player_team_id: string
  team: Team
  pot: number
  progress: TeamProgress
}

export type PlayerWithScore = {
  player: Player
  teams: PlayerTeamWithProgress[]
  totalScore: number
}
```

- [ ] **Step 2: Create Supabase admin client**

Create `lib/supabase/admin.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

// Use service role key — NEVER import this in client components
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/
git commit -m "feat: add TypeScript types and Supabase admin client"
```

---

## Task 4: Scoring Engine (TDD)

**Files:**
- Create: `lib/draw-utils.ts`
- Create: `lib/scoring.ts`
- Create: `lib/__tests__/draw-utils.test.ts`
- Create: `lib/__tests__/scoring.test.ts`

- [ ] **Step 1: Write failing tests for draw-utils**

Create `lib/__tests__/draw-utils.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { shuffleAndAssign } from '../draw-utils'

describe('shuffleAndAssign', () => {
  it('returns one assignment per player', () => {
    const players = ['p1', 'p2', 'p3']
    const teams = ['t1', 't2', 't3']
    const result = shuffleAndAssign(players, teams)
    expect(result).toHaveLength(3)
  })

  it('uses each player exactly once', () => {
    const players = ['p1', 'p2', 'p3', 'p4']
    const teams = ['t1', 't2', 't3', 't4']
    const result = shuffleAndAssign(players, teams)
    const playerIds = result.map(r => r.playerId)
    expect(new Set(playerIds).size).toBe(4)
    expect(playerIds.sort()).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('uses each team exactly once', () => {
    const players = ['p1', 'p2', 'p3', 'p4']
    const teams = ['t1', 't2', 't3', 't4']
    const result = shuffleAndAssign(players, teams)
    const teamIds = result.map(r => r.teamId)
    expect(new Set(teamIds).size).toBe(4)
    expect(teamIds.sort()).toEqual(['t1', 't2', 't3', 't4'])
  })

  it('throws when arrays have different lengths', () => {
    expect(() => shuffleAndAssign(['p1', 'p2'], ['t1'])).toThrow(
      'Players and teams arrays must have equal length'
    )
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test
```
Expected: FAIL — `Cannot find module '../draw-utils'`

- [ ] **Step 3: Implement draw-utils**

Create `lib/draw-utils.ts`:
```typescript
export function shuffleAndAssign<T extends string>(
  players: T[],
  teams: T[]
): Array<{ playerId: T; teamId: T }> {
  if (players.length !== teams.length) {
    throw new Error('Players and teams arrays must have equal length')
  }
  const shuffled = [...teams].sort(() => Math.random() - 0.5)
  return players.map((playerId, i) => ({ playerId, teamId: shuffled[i] }))
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test
```
Expected: PASS — 4 draw-utils tests pass.

- [ ] **Step 5: Write failing tests for scoring**

Create `lib/__tests__/scoring.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { getScoreBreakdown, calculateTeamScore } from '../scoring'
import type { TeamProgress } from '../types'

const mkProgress = (overrides: Partial<TeamProgress>): TeamProgress => ({
  team_id: 'test',
  group_wins: 0,
  group_draws: 0,
  stage_reached: 'group_stage',
  is_champion: false,
  updated_at: '',
  ...overrides,
})

describe('group stage scoring', () => {
  it('scores 3 points per win', () => {
    const p = mkProgress({ group_wins: 2 })
    expect(calculateTeamScore(p, 1)).toBe(6)
  })

  it('scores 1 point per draw', () => {
    const p = mkProgress({ group_draws: 3 })
    expect(calculateTeamScore(p, 1)).toBe(3)
  })

  it('combines wins and draws', () => {
    const p = mkProgress({ group_wins: 2, group_draws: 1 })
    expect(calculateTeamScore(p, 1)).toBe(7)
  })
})

describe('knockout stage points', () => {
  it('0 points for group_stage', () => {
    const p = mkProgress({ group_wins: 1, stage_reached: 'group_stage' })
    const b = getScoreBreakdown(p, 1)
    expect(b.knockoutPoints).toBe(0)
  })

  it('0 knockout points for r32 (lost in r32, no knockout wins)', () => {
    const p = mkProgress({ stage_reached: 'r32' })
    const b = getScoreBreakdown(p, 1)
    expect(b.knockoutPoints).toBe(0)
  })

  it('+5 for r16 (won r32)', () => {
    const p = mkProgress({ stage_reached: 'r16' })
    const b = getScoreBreakdown(p, 1)
    expect(b.knockoutPoints).toBe(5)
  })

  it('+13 for qf (won r32+r16)', () => {
    const p = mkProgress({ stage_reached: 'qf' })
    const b = getScoreBreakdown(p, 1)
    expect(b.knockoutPoints).toBe(13)
  })

  it('+25 for sf (won r32+r16+qf)', () => {
    const p = mkProgress({ stage_reached: 'sf' })
    const b = getScoreBreakdown(p, 1)
    expect(b.knockoutPoints).toBe(25)
  })

  it('+40 for final (won r32+r16+qf+sf)', () => {
    const p = mkProgress({ stage_reached: 'final' })
    const b = getScoreBreakdown(p, 1)
    expect(b.knockoutPoints).toBe(40)
  })

  it('+65 for champion (won everything)', () => {
    const p = mkProgress({ stage_reached: 'champion', is_champion: true })
    const b = getScoreBreakdown(p, 1)
    expect(b.knockoutPoints).toBe(65)
  })
})

describe('cinderela bonus — pot 3', () => {
  it('no bonus for group_stage', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'group_stage' }), 3)
    expect(b.cinderelaBonusTotal).toBe(0)
  })

  it('+3 for reaching qf', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'qf' }), 3)
    expect(b.cinderelaBonusTotal).toBe(3)
  })

  it('+10 cumulative for reaching sf (3+7)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'sf' }), 3)
    expect(b.cinderelaBonusTotal).toBe(10)
  })

  it('+20 cumulative for reaching final (3+7+10)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'final' }), 3)
    expect(b.cinderelaBonusTotal).toBe(20)
  })

  it('+35 cumulative for champion (3+7+10+15)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'champion', is_champion: true }), 3)
    expect(b.cinderelaBonusTotal).toBe(35)
  })
})

describe('cinderela bonus — pot 4', () => {
  it('+5 for reaching qf', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'qf' }), 4)
    expect(b.cinderelaBonusTotal).toBe(5)
  })

  it('+50 cumulative for champion (5+10+15+20)', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'champion', is_champion: true }), 4)
    expect(b.cinderelaBonusTotal).toBe(50)
  })
})

describe('no cinderela bonus for pots 1 and 2', () => {
  it('pot 1 gets 0 bonus even at champion', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'champion', is_champion: true }), 1)
    expect(b.cinderelaBonusTotal).toBe(0)
  })

  it('pot 2 gets 0 bonus even at champion', () => {
    const b = getScoreBreakdown(mkProgress({ stage_reached: 'champion', is_champion: true }), 2)
    expect(b.cinderelaBonusTotal).toBe(0)
  })
})

describe('full score calculation', () => {
  it('calculates total correctly for a pot 3 team at sf', () => {
    // 2 wins + 1 draw in groups = 7
    // sf knockout = 25
    // cinderela sf = +10
    // total = 42
    const p = mkProgress({ group_wins: 2, group_draws: 1, stage_reached: 'sf' })
    expect(calculateTeamScore(p, 3)).toBe(42)
  })
})
```

- [ ] **Step 6: Run tests — expect failure**

```bash
npm test
```
Expected: FAIL — `Cannot find module '../scoring'`

- [ ] **Step 7: Implement scoring engine**

Create `lib/scoring.ts`:
```typescript
import type { TeamProgress, StageReached } from './types'

// stage_reached semantics:
// group_stage = eliminated in groups
// r32         = played in r32, lost (0 knockout wins)
// r16         = played in r16, lost (won r32 = +5)
// qf          = played in qf, lost (won r32+r16 = +13)
// sf          = played in sf, lost (won r32+r16+qf = +25)
// final       = played in final, lost (won r32+r16+qf+sf = +40)
// champion    = won the final (won everything = +65)

const STAGE_ORDER: StageReached[] = [
  'group_stage', 'r32', 'r16', 'qf', 'sf', 'final', 'champion',
]

// Points for winning the match that advanced you TO this stage
const POINTS_FOR_WINNING_INTO: Partial<Record<StageReached, number>> = {
  r16: 5,       // won r32 to reach r16
  qf: 8,        // won r16 to reach qf
  sf: 12,       // won qf to reach sf
  final: 15,    // won sf to reach final
  champion: 25, // won the final
}

const CINDERELA_BONUS: Record<3 | 4, Partial<Record<StageReached, number>>> = {
  3: { qf: 3, sf: 7, final: 10, champion: 15 },
  4: { qf: 5, sf: 10, final: 15, champion: 20 },
}

export type KnockoutRoundDetail = { label: string; points: number }
export type CinderelaBonusDetail = { label: string; points: number }

export type ScoreBreakdown = {
  groupStagePoints: number
  knockoutPoints: number
  knockoutDetail: KnockoutRoundDetail[]
  cinderelaBonusTotal: number
  cinderelaBonusDetail: CinderelaBonusDetail[]
  total: number
}

export function getScoreBreakdown(progress: TeamProgress, pot: number): ScoreBreakdown {
  const groupStagePoints = progress.group_wins * 3 + progress.group_draws

  const stageRank = STAGE_ORDER.indexOf(progress.stage_reached)

  // Knockout rounds: you earned points for winning each round that advanced you forward
  const knockoutRounds: Array<{ stage: StageReached; label: string }> = [
    { stage: 'r16', label: '1/16 de final' },
    { stage: 'qf', label: '1/8 de final' },
    { stage: 'sf', label: 'Quartos de final' },
    { stage: 'final', label: 'Meia-final' },
    { stage: 'champion', label: 'Campeão Mundial' },
  ]

  const knockoutDetail: KnockoutRoundDetail[] = []
  for (const { stage, label } of knockoutRounds) {
    const sRank = STAGE_ORDER.indexOf(stage)
    if (sRank <= stageRank) {
      const pts = POINTS_FOR_WINNING_INTO[stage] ?? 0
      if (pts > 0) knockoutDetail.push({ label, points: pts })
    }
  }
  const knockoutPoints = knockoutDetail.reduce((s, r) => s + r.points, 0)

  // Cinderela bonus (cumulative, only pots 3 and 4)
  const cinderelaBonusDetail: CinderelaBonusDetail[] = []
  if (pot === 3 || pot === 4) {
    const table = CINDERELA_BONUS[pot as 3 | 4]
    const bonusMilestones: Array<{ stage: StageReached; label: string }> = [
      { stage: 'qf', label: 'Quartos de final' },
      { stage: 'sf', label: 'Meia-final' },
      { stage: 'final', label: 'Final' },
      { stage: 'champion', label: 'Campeão' },
    ]
    for (const { stage, label } of bonusMilestones) {
      const sRank = STAGE_ORDER.indexOf(stage)
      if (sRank <= stageRank) {
        const pts = table[stage] ?? 0
        cinderelaBonusDetail.push({ label, points: pts })
      }
    }
  }
  const cinderelaBonusTotal = cinderelaBonusDetail.reduce((s, r) => s + r.points, 0)

  return {
    groupStagePoints,
    knockoutPoints,
    knockoutDetail,
    cinderelaBonusTotal,
    cinderelaBonusDetail,
    total: groupStagePoints + knockoutPoints + cinderelaBonusTotal,
  }
}

export function calculateTeamScore(progress: TeamProgress, pot: number): number {
  return getScoreBreakdown(progress, pot).total
}
```

- [ ] **Step 8: Run tests — expect all pass**

```bash
npm test
```
Expected: PASS — all 20 scoring + draw tests pass.

- [ ] **Step 9: Commit**

```bash
git add lib/
git commit -m "feat: implement scoring engine and draw utils with tests"
```

---

## Task 5: Dark Theme & Root Layout

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `app/not-found.tsx`

- [ ] **Step 1: Configure dark/gold theme in Tailwind**

Replace the `theme.extend` section of `tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#f0c040',
          light: '#f5d170',
          dark: '#b8920a',
          muted: 'rgba(240,192,64,0.15)',
        },
        night: {
          DEFAULT: '#0a0a1a',
          card: '#12121f',
          border: '#1e1e35',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

- [ ] **Step 2: Set CSS variables for shadcn dark theme**

Replace the content of `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 15% 7%;
    --foreground: 240 20% 92%;
    --card: 240 20% 9%;
    --card-foreground: 240 20% 92%;
    --popover: 240 20% 9%;
    --popover-foreground: 240 20% 92%;
    --primary: 45 85% 60%;
    --primary-foreground: 240 15% 7%;
    --secondary: 240 15% 18%;
    --secondary-foreground: 240 20% 92%;
    --muted: 240 15% 18%;
    --muted-foreground: 240 15% 60%;
    --accent: 240 15% 18%;
    --accent-foreground: 45 85% 60%;
    --destructive: 0 62% 50%;
    --destructive-foreground: 240 20% 92%;
    --border: 240 15% 18%;
    --input: 240 15% 18%;
    --ring: 45 85% 60%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-night text-foreground;
    min-height: 100dvh;
  }
}
```

- [ ] **Step 3: Update root layout**

Replace `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Puras Cinderelas 2026',
  description: 'Jogo de prognósticos para o Mundial FIFA 2026',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Create global 404 page**

Create `app/not-found.tsx`:
```typescript
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground text-sm">Página não encontrada</p>
      <Link
        href="/"
        className="text-gold text-sm underline underline-offset-4"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```
Expected: Build completes without errors.

- [ ] **Step 6: Commit**

```bash
git add app/ tailwind.config.ts
git commit -m "feat: configure dark/gold theme and root layout"
```

---

## Task 6: Admin Auth Middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create middleware**

Create `middleware.ts` at project root:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (token !== process.env.ADMIN_SECRET) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
```

- [ ] **Step 2: Verify middleware blocks access**

Start dev server: `npm run dev`

Visit `http://localhost:3000/admin` → expect redirect to `/`.
Visit `http://localhost:3000/admin?token=wrong` → expect redirect to `/`.
Visit `http://localhost:3000/admin?token=<your ADMIN_SECRET>` → expect 404 (page not built yet, but NOT a redirect).

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add admin route protection middleware"
```

---

## Task 7: Server Actions — Competition & Players

**Files:**
- Create: `actions/competition.ts`
- Create: `actions/players.ts`

- [ ] **Step 1: Create competition actions**

Create `actions/competition.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CompetitionStatus } from '@/lib/types'

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

export async function getCompetition() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('competition')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) throw error
  return data
}
```

- [ ] **Step 2: Create player actions**

Create `actions/players.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createPlayer(name: string) {
  if (!name.trim()) throw new Error('Nome é obrigatório')

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('players')
    .insert({ name: name.trim() })

  if (error) throw error

  revalidatePath('/admin')
}

export async function getAllPlayers() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getPlayerByToken(token: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('access_token', token)
    .single()

  if (error) return null
  return data
}
```

- [ ] **Step 3: Commit**

```bash
git add actions/
git commit -m "feat: add competition and player server actions"
```

---

## Task 8: Server Actions — Draft (Draw & Team Selection)

**Files:**
- Create: `actions/draft.ts`

- [ ] **Step 1: Create draft actions**

Create `actions/draft.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { shuffleAndAssign } from '@/lib/draw-utils'

export async function executeDraw() {
  const supabase = createAdminClient()

  // Validate state
  const { data: competition } = await supabase
    .from('competition')
    .select('status')
    .eq('id', 1)
    .single()

  if (competition?.status !== 'draft') {
    throw new Error('O sorteio só pode ser executado no estado "draft"')
  }

  // Guard: ensure draw hasn't already been done
  const { data: existing } = await supabase
    .from('player_teams')
    .select('id')
    .eq('pot', 1)
    .limit(1)

  if (existing && existing.length > 0) {
    throw new Error('Sorteio já realizado')
  }

  // Fetch players and pot 1 teams
  const { data: players, error: pErr } = await supabase
    .from('players')
    .select('id')

  const { data: pot1Teams, error: tErr } = await supabase
    .from('teams')
    .select('id')
    .eq('pot', 1)

  if (pErr || tErr || !players || !pot1Teams) {
    throw new Error('Erro ao obter jogadores ou equipas')
  }

  if (players.length !== pot1Teams.length) {
    throw new Error(
      `Número de jogadores (${players.length}) deve ser igual ao número de equipas do Pote 1 (${pot1Teams.length})`
    )
  }

  // Shuffle and assign
  const assignments = shuffleAndAssign(
    players.map(p => p.id),
    pot1Teams.map(t => t.id)
  )

  const { error } = await supabase.from('player_teams').insert(
    assignments.map(({ playerId, teamId }) => ({
      player_id: playerId,
      team_id: teamId,
      pot: 1,
    }))
  )

  if (error) throw error

  revalidatePath('/', 'layout')
}

export async function chooseTeam(
  playerToken: string,
  teamId: string,
  pot: 2 | 3 | 4
) {
  const supabase = createAdminClient()

  // Validate competition is in draft
  const { data: competition } = await supabase
    .from('competition')
    .select('status')
    .eq('id', 1)
    .single()

  if (competition?.status !== 'draft') {
    throw new Error('As escolhas estão encerradas')
  }

  // Validate player exists
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('access_token', playerToken)
    .single()

  if (!player) throw new Error('Jogador não encontrado')

  // Validate team belongs to the correct pot
  const { data: team } = await supabase
    .from('teams')
    .select('pot')
    .eq('id', teamId)
    .single()

  if (!team || team.pot !== pot) {
    throw new Error(`Equipa não pertence ao Pote ${pot}`)
  }

  // Upsert (replace existing choice for this pot if any)
  const { error } = await supabase
    .from('player_teams')
    .upsert(
      { player_id: player.id, team_id: teamId, pot },
      { onConflict: 'player_id,pot' }
    )

  if (error) throw error

  revalidatePath(`/play/${playerToken}`, 'layout')
}

export async function getPlayerTeams(playerId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('player_teams')
    .select(`
      id,
      pot,
      teams (
        id, name, pot, flag_emoji, api_id,
        team_progress (
          group_wins, group_draws, stage_reached, is_champion, updated_at
        )
      )
    `)
    .eq('player_id', playerId)
    .order('pot', { ascending: true })

  if (error) throw error
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add actions/draft.ts
git commit -m "feat: add draw and team selection server actions"
```

---

## Task 9: Server Actions — Results & Sync

**Files:**
- Create: `actions/results.ts`

- [ ] **Step 1: Create results actions**

Create `actions/results.ts`:
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
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
```

- [ ] **Step 2: Commit**

```bash
git add actions/results.ts
git commit -m "feat: add results update and manual sync server actions"
```

---

## Task 10: Admin Panel UI

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Create: `components/admin/competition-controls.tsx`
- Create: `components/admin/players-manager.tsx`
- Create: `components/admin/draw-button.tsx`
- Create: `components/admin/results-editor.tsx`

- [ ] **Step 1: Create admin layout**

Create `app/admin/layout.tsx`:
```typescript
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-night p-4 pb-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-gold font-bold tracking-widest uppercase text-sm">
            Puras Cinderelas 2026
          </h1>
          <p className="text-muted-foreground text-xs">Painel de Administração</p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto space-y-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Create competition controls component**

Create `components/admin/competition-controls.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { advanceStatus } from '@/actions/competition'
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
        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Create players manager component**

Create `components/admin/players-manager.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createPlayer } from '@/actions/players'
import type { Player } from '@/lib/types'

export function PlayersManager({
  players,
}: {
  players: Player[]
}) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : ''

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      await createPlayer(name)
      setName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar jogador')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-night-card border-night-border">
      <CardHeader>
        <CardTitle className="text-gold text-sm uppercase tracking-widest">
          Jogadores ({players.length}/12)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome do jogador"
            className="bg-night border-night-border text-foreground"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <Button
            onClick={handleCreate}
            disabled={loading || players.length >= 12}
            className="bg-gold text-night hover:bg-gold-light font-semibold shrink-0"
          >
            {loading ? '...' : 'Adicionar'}
          </Button>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="space-y-2">
          {players.map(player => (
            <div
              key={player.id}
              className="flex flex-col gap-1 rounded border border-night-border bg-night p-3"
            >
              <span className="text-foreground font-medium">{player.name}</span>
              <a
                href={`${baseUrl}/play/${player.access_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground text-xs break-all hover:text-gold transition-colors"
              >
                {baseUrl}/play/{player.access_token}
              </a>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Create draw button component**

Create `components/admin/draw-button.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { executeDraw } from '@/actions/draft'

export function DrawButton({ drawDone }: { drawDone: boolean }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(drawDone)
  const [error, setError] = useState<string | null>(null)

  async function handleDraw() {
    if (!confirm('Confirmas o sorteio do Pote 1? Esta ação não pode ser desfeita.')) return
    setLoading(true)
    setError(null)
    try {
      await executeDraw()
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro no sorteio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-night-card border-night-border">
      <CardHeader>
        <CardTitle className="text-gold text-sm uppercase tracking-widest">
          Sorteio do Pote 1
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {done ? (
          <p className="text-sm text-muted-foreground">
            ✓ Sorteio concluído. Cada jogador tem uma equipa do Pote 1 atribuída.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Atribui aleatoriamente as 12 equipas do Pote 1 aos 12 jogadores.
              Garante que todos os 12 jogadores estão criados antes de executar.
            </p>
            <Button
              onClick={handleDraw}
              disabled={loading}
              className="bg-gold text-night hover:bg-gold-light font-semibold"
            >
              {loading ? 'A sortear...' : '🎲 Executar Sorteio'}
            </Button>
          </>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Create results editor component**

Create `components/admin/results-editor.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateTeamProgress, triggerManualSync } from '@/actions/results'
import type { StageReached } from '@/lib/types'

const STAGE_OPTIONS: Array<{ value: StageReached; label: string }> = [
  { value: 'group_stage', label: 'Fase de Grupos' },
  { value: 'r32', label: '1/16 de Final' },
  { value: 'r16', label: '1/8 de Final' },
  { value: 'qf', label: 'Quartos de Final' },
  { value: 'sf', label: 'Meia-Final' },
  { value: 'final', label: 'Final (eliminado)' },
  { value: 'champion', label: 'Campeão Mundial' },
]

type TeamRow = {
  id: string
  name: string
  pot: number
  flag_emoji: string
  team_progress: Array<{
    group_wins: number
    group_draws: number
    stage_reached: string
    is_champion: boolean
    updated_at: string
  }>
}

export function ResultsEditor({
  teams,
  lastSyncedAt,
}: {
  teams: TeamRow[]
  lastSyncedAt: string | null
}) {
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncOk, setSyncOk] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    setSyncOk(false)
    try {
      await triggerManualSync()
      setSyncOk(true)
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync falhou')
    } finally {
      setSyncing(false)
    }
  }

  async function handleSave(
    teamId: string,
    groupWins: number,
    groupDraws: number,
    stageReached: StageReached
  ) {
    setSaving(teamId)
    try {
      await updateTeamProgress({
        teamId,
        groupWins,
        groupDraws,
        stageReached,
        isChampion: stageReached === 'champion',
      })
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card className="bg-night-card border-night-border">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-gold text-sm uppercase tracking-widest">
            Resultados das Seleções
          </CardTitle>
          <div className="flex flex-col items-end gap-1">
            <Button
              onClick={handleSync}
              disabled={syncing}
              size="sm"
              variant="outline"
              className="border-gold text-gold hover:bg-gold-muted text-xs"
            >
              {syncing ? 'A sincronizar...' : '🔄 Sincronizar agora'}
            </Button>
            {lastSyncedAt && (
              <span className="text-muted-foreground text-xs">
                Último sync: {new Date(lastSyncedAt).toLocaleString('pt-PT')}
              </span>
            )}
            {syncOk && (
              <span className="text-green-400 text-xs">✓ Sincronizado</span>
            )}
            {syncError && (
              <span className="text-destructive text-xs">{syncError}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {[1, 2, 3, 4].map(pot => (
          <div key={pot}>
            <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1 mt-3">
              Pote {pot}
            </p>
            {teams
              .filter(t => t.pot === pot)
              .map(team => {
                const progress = team.team_progress[0] ?? {
                  group_wins: 0,
                  group_draws: 0,
                  stage_reached: 'group_stage',
                  is_champion: false,
                }
                return (
                  <TeamResultRow
                    key={team.id}
                    team={team}
                    progress={progress}
                    saving={saving === team.id}
                    onSave={(gw, gd, sr) => handleSave(team.id, gw, gd, sr)}
                  />
                )
              })}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function TeamResultRow({
  team,
  progress,
  saving,
  onSave,
}: {
  team: TeamRow
  progress: { group_wins: number; group_draws: number; stage_reached: string; is_champion: boolean }
  saving: boolean
  onSave: (gw: number, gd: number, sr: StageReached) => void
}) {
  const [wins, setWins] = useState(String(progress.group_wins))
  const [draws, setDraws] = useState(String(progress.group_draws))
  const [stage, setStage] = useState<StageReached>(
    progress.stage_reached as StageReached
  )

  return (
    <div className="flex items-center gap-2 py-2 border-b border-night-border last:border-0 flex-wrap">
      <span className="text-base w-6">{team.flag_emoji}</span>
      <span className="text-foreground text-sm w-36 shrink-0">{team.name}</span>
      <div className="flex items-center gap-1">
        <label className="text-muted-foreground text-xs">V</label>
        <Input
          type="number"
          min={0}
          max={99}
          value={wins}
          onChange={e => setWins(e.target.value)}
          className="w-12 h-7 text-xs bg-night border-night-border text-center"
        />
      </div>
      <div className="flex items-center gap-1">
        <label className="text-muted-foreground text-xs">E</label>
        <Input
          type="number"
          min={0}
          max={99}
          value={draws}
          onChange={e => setDraws(e.target.value)}
          className="w-12 h-7 text-xs bg-night border-night-border text-center"
        />
      </div>
      <Select value={stage} onValueChange={v => setStage(v as StageReached)}>
        <SelectTrigger className="h-7 text-xs bg-night border-night-border w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-night-card border-night-border">
          {STAGE_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        onClick={() => onSave(Number(wins), Number(draws), stage)}
        disabled={saving}
        className="h-7 text-xs bg-gold text-night hover:bg-gold-light"
      >
        {saving ? '...' : 'Guardar'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 6: Create admin page**

Create `app/admin/page.tsx`:
```typescript
import { getCompetition } from '@/actions/competition'
import { getAllPlayers } from '@/actions/players'
import { getAllTeamsWithProgress } from '@/actions/results'
import { createAdminClient } from '@/lib/supabase/admin'
import { CompetitionControls } from '@/components/admin/competition-controls'
import { PlayersManager } from '@/components/admin/players-manager'
import { DrawButton } from '@/components/admin/draw-button'
import { ResultsEditor } from '@/components/admin/results-editor'

async function getDrawDone() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('player_teams')
    .select('id')
    .eq('pot', 1)
    .limit(1)
  return (data?.length ?? 0) > 0
}

export default async function AdminPage() {
  const [competition, players, teams, drawDone] = await Promise.all([
    getCompetition(),
    getAllPlayers(),
    getAllTeamsWithProgress(),
    getDrawDone(),
  ])

  return (
    <div className="space-y-6">
      <CompetitionControls competition={competition} />
      <PlayersManager players={players} />
      {competition.status === 'draft' && (
        <DrawButton drawDone={drawDone} />
      )}
      {(competition.status === 'running' || competition.status === 'finished' || competition.status === 'locked') && (
        <ResultsEditor teams={teams} lastSyncedAt={competition.last_synced_at} />
      )}
    </div>
  )
}
```

- [ ] **Step 7: Test admin panel**

```bash
npm run dev
```
Visit `http://localhost:3000/admin?token=<your ADMIN_SECRET>`.
Expected: Admin panel renders with competition status, player creation form.

- [ ] **Step 8: Commit**

```bash
git add app/admin/ components/admin/
git commit -m "feat: build admin panel with competition, players, draw, and results"
```

---

## Task 11: Shared Components (Ranking Table + Sync Indicator)

**Files:**
- Create: `components/ranking-table.tsx`
- Create: `components/sync-indicator.tsx`

- [ ] **Step 1: Create ranking data helper**

Add to `actions/results.ts` (append at the bottom of the file):
```typescript
export async function getRankings() {
  const supabase = createAdminClient()

  // Fetch all players with their teams + team progress
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

  const { getScoreBreakdown } = await import('@/lib/scoring')

  const ranked = players.map(player => {
    const myTeams = (playerTeams ?? []).filter(pt => pt.player_id === player.id)

    const teamsWithScores = myTeams.map(pt => {
      const team = pt.teams as any
      const progress = team?.team_progress?.[0] ?? {
        group_wins: 0, group_draws: 0, stage_reached: 'group_stage', is_champion: false,
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

  // Sort by total score DESC, then by tiebreak criteria
  ranked.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    // Tiebreak 1: more champions
    const champA = a.teams.filter(t => t.progress.stage_reached === 'champion').length
    const champB = b.teams.filter(t => t.progress.stage_reached === 'champion').length
    if (champB !== champA) return champB - champA
    // Tiebreak 2: more finalists
    const finA = a.teams.filter(t => ['final', 'champion'].includes(t.progress.stage_reached)).length
    const finB = b.teams.filter(t => ['final', 'champion'].includes(t.progress.stage_reached)).length
    if (finB !== finA) return finB - finA
    // Tiebreak 3: more semi-finalists
    const sfA = a.teams.filter(t => ['sf', 'final', 'champion'].includes(t.progress.stage_reached)).length
    const sfB = b.teams.filter(t => ['sf', 'final', 'champion'].includes(t.progress.stage_reached)).length
    if (sfB !== sfA) return sfB - sfA
    // Tiebreak 4: more quarter-finalists
    const qfA = a.teams.filter(t => ['qf', 'sf', 'final', 'champion'].includes(t.progress.stage_reached)).length
    const qfB = b.teams.filter(t => ['qf', 'sf', 'final', 'champion'].includes(t.progress.stage_reached)).length
    return qfB - qfA
  })

  return ranked
}
```

- [ ] **Step 2: Create sync indicator component**

Create `components/sync-indicator.tsx`:
```typescript
'use client'

import { useEffect, useState } from 'react'

export function SyncIndicator({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    function compute() {
      if (!lastSyncedAt) {
        setLabel('Aguarda primeira sincronização')
        return
      }
      const next = new Date(lastSyncedAt).getTime() + 30 * 60 * 1000
      const diffMs = next - Date.now()
      if (diffMs <= 0) {
        setLabel('Atualização pendente...')
        return
      }
      const mins = Math.ceil(diffMs / 60000)
      setLabel(`Próxima atualização em ${mins} min`)
    }

    compute()
    const interval = setInterval(compute, 30_000)
    return () => clearInterval(interval)
  }, [lastSyncedAt])

  if (!label) return null

  return (
    <p className="text-muted-foreground text-xs text-center">
      🔄 {label}
    </p>
  )
}
```

- [ ] **Step 3: Create ranking table component**

Create `components/ranking-table.tsx`:
```typescript
import type { getRankings } from '@/actions/results'

type Rankings = Awaited<ReturnType<typeof getRankings>>

const STAGE_SHORT: Record<string, string> = {
  group_stage: 'GR',
  r32: '1/16',
  r16: '1/8',
  qf: 'QF',
  sf: 'SF',
  final: 'F',
  champion: '🏆',
}

export function RankingTable({
  rankings,
  expandedId,
  showToken = false,
}: {
  rankings: Rankings
  expandedId?: string
  showToken?: boolean
}) {
  return (
    <div className="space-y-1">
      {rankings.map((entry, idx) => (
        <RankingRow
          key={entry.player.id}
          position={idx + 1}
          entry={entry}
          defaultExpanded={expandedId === entry.player.id}
          showToken={showToken}
        />
      ))}
    </div>
  )
}

function RankingRow({
  position,
  entry,
  defaultExpanded,
  showToken,
}: {
  position: number
  entry: Rankings[number]
  defaultExpanded: boolean
  showToken: boolean
}) {
  // We use details/summary for zero-JS expand — works in RSC
  return (
    <details
      open={defaultExpanded}
      className="rounded border border-night-border bg-night-card overflow-hidden group"
    >
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
        <span className="text-muted-foreground text-sm w-5 text-center font-mono">
          {position}
        </span>
        <span className="text-foreground font-medium flex-1">{entry.player.name}</span>
        <span className="text-gold font-bold tabular-nums">
          {entry.totalScore} pts
        </span>
      </summary>
      <div className="px-4 pb-3 border-t border-night-border space-y-2">
        {entry.teams
          .sort((a, b) => a.pot - b.pot)
          .map(t => (
            <div
              key={t.team.id}
              className="flex items-center gap-2 text-sm py-1"
            >
              <span className="text-base">{t.team.flag_emoji}</span>
              <span className="text-foreground flex-1">{t.team.name}</span>
              <span className="text-muted-foreground text-xs">
                {STAGE_SHORT[t.progress.stage_reached] ?? t.progress.stage_reached}
              </span>
              <span className="text-gold font-semibold tabular-nums text-xs">
                {t.breakdown.total} pts
              </span>
            </div>
          ))}
      </div>
    </details>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ actions/results.ts
git commit -m "feat: add ranking table, sync indicator, and getRankings action"
```

---

## Task 12: Public Page (/)

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Build public page**

Replace `app/page.tsx`:
```typescript
import { getCompetition } from '@/actions/competition'
import { getRankings } from '@/actions/results'
import { RankingTable } from '@/components/ranking-table'
import { SyncIndicator } from '@/components/sync-indicator'

const STATUS_MESSAGES: Record<string, string> = {
  setup: 'Competição em preparação',
  draft: 'Sorteio em curso — escolhas abertas',
  locked: 'Escolhas encerradas — a aguardar o início',
  running: 'A decorrer',
  finished: 'Competição terminada',
}

export const revalidate = 60 // revalidate every 60 seconds

export default async function PublicPage() {
  const [competition, rankings] = await Promise.all([
    getCompetition(),
    getRankings(),
  ])

  const isRunningOrAfter = ['running', 'finished'].includes(competition.status)

  return (
    <div className="min-h-dvh bg-night px-4 py-8 max-w-lg mx-auto">
      <header className="mb-8 text-center">
        <p className="text-gold text-xs uppercase tracking-widest mb-1">
          Mundial FIFA 2026
        </p>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">
          Puras Cinderelas
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          {STATUS_MESSAGES[competition.status] ?? competition.status}
        </p>
        {isRunningOrAfter && (
          <div className="mt-2">
            <SyncIndicator lastSyncedAt={competition.last_synced_at} />
          </div>
        )}
      </header>

      {rankings.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center">
          Ainda não há classificação disponível.
        </p>
      ) : (
        <RankingTable rankings={rankings} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Test public page**

```bash
npm run dev
```
Visit `http://localhost:3000`. Expected: Dark page with "Puras Cinderelas" header and competition status. If players + teams exist in DB, rankings show.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: build public page with rankings and sync indicator"
```

---

## Task 13: Player Area — Layout & Token Validation

**Files:**
- Create: `app/play/[token]/layout.tsx`
- Create: `app/play/[token]/page.tsx`
- Create: `app/play/[token]/not-found.tsx`

- [ ] **Step 1: Create player layout with tab bar**

Create `app/play/[token]/layout.tsx`:
```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlayerByToken } from '@/actions/players'

export default async function PlayerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { token: string }
}) {
  const player = await getPlayerByToken(params.token)

  if (!player) {
    notFound()
  }

  const base = `/play/${params.token}`

  return (
    <div className="min-h-dvh bg-night flex flex-col">
      <header className="px-4 pt-6 pb-2">
        <p className="text-gold text-xs uppercase tracking-widest">
          Puras Cinderelas 2026
        </p>
        <h1 className="text-foreground font-bold text-lg">{player.name}</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-24">
        {children}
      </main>

      {/* Fixed tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-night-card border-t border-night-border flex">
        <TabLink href={`${base}/team`} label="Equipa" icon="⚽" />
        <TabLink href={`${base}/ranking`} label="Classificação" icon="🏆" />
        <TabLink href={`${base}/selections`} label="Seleções" icon="🌍" />
      </nav>
    </div>
  )
}

function TabLink({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: string
}) {
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center py-3 text-muted-foreground hover:text-gold transition-colors active:text-gold"
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-xs mt-1">{label}</span>
    </Link>
  )
}
```

- [ ] **Step 2: Create redirect from /play/[token] to /play/[token]/team**

Create `app/play/[token]/page.tsx`:
```typescript
import { redirect } from 'next/navigation'

export default function PlayerRoot({ params }: { params: { token: string } }) {
  redirect(`/play/${params.token}/team`)
}
```

- [ ] **Step 3: Create 404 for invalid tokens**

Create `app/play/[token]/not-found.tsx`:
```typescript
import Link from 'next/link'

export default function PlayerNotFound() {
  return (
    <div className="min-h-dvh bg-night flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-muted-foreground text-sm text-center">
        Link inválido ou expirado.
      </p>
      <Link href="/" className="text-gold text-sm underline underline-offset-4">
        Ver classificação
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Test token validation**

```bash
npm run dev
```
Visit `http://localhost:3000/play/invalid-token` → expect 404 page.
Create a player in admin panel, then visit their link → expect layout with tab bar.

- [ ] **Step 5: Commit**

```bash
git add app/play/
git commit -m "feat: add player area layout with token validation and tab bar"
```

---

## Task 14: Player Area — Team Tab

**Files:**
- Create: `app/play/[token]/team/page.tsx`
- Create: `components/team-card.tsx`
- Create: `components/team-selector.tsx`

- [ ] **Step 1: Create team card with score breakdown**

Create `components/team-card.tsx`:
```typescript
import type { ScoreBreakdown } from '@/lib/scoring'
import type { TeamProgress } from '@/lib/types'

const STAGE_LABELS: Record<string, string> = {
  group_stage: 'Fase de Grupos',
  r32: '1/16 de Final',
  r16: '1/8 de Final',
  qf: 'Quartos de Final',
  sf: 'Meia-Final',
  final: 'Final',
  champion: 'Campeão Mundial 🏆',
}

export function TeamCard({
  name,
  flagEmoji,
  pot,
  progress,
  breakdown,
}: {
  name: string
  flagEmoji: string
  pot: number
  progress: TeamProgress
  breakdown: ScoreBreakdown
}) {
  return (
    <details className="rounded border border-night-border bg-night-card overflow-hidden">
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
        <span className="text-2xl">{flagEmoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-foreground font-semibold truncate">{name}</p>
          <p className="text-muted-foreground text-xs">
            Pote {pot} · {STAGE_LABELS[progress.stage_reached] ?? progress.stage_reached}
          </p>
        </div>
        <span className="text-gold font-bold text-lg tabular-nums">
          {breakdown.total}
        </span>
      </summary>

      <div className="px-4 pb-3 pt-2 border-t border-night-border space-y-1 text-sm">
        {/* Group stage */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Fase de grupos ({progress.group_wins}V {progress.group_draws}E)
          </span>
          <span className="text-foreground tabular-nums">
            +{breakdown.groupStagePoints}
          </span>
        </div>

        {/* Knockout rounds */}
        {breakdown.knockoutDetail.map(r => (
          <div key={r.label} className="flex justify-between">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="text-foreground tabular-nums">+{r.points}</span>
          </div>
        ))}

        {/* Cinderela bonuses */}
        {breakdown.cinderelaBonusDetail.map(b => (
          <div key={b.label} className="flex justify-between">
            <span className="text-yellow-400/80 text-xs">
              ✨ Bónus Cinderela · {b.label}
            </span>
            <span className="text-yellow-400 tabular-nums">+{b.points}</span>
          </div>
        ))}

        <div className="flex justify-between border-t border-night-border pt-1 mt-1 font-semibold">
          <span className="text-muted-foreground">Total</span>
          <span className="text-gold">{breakdown.total} pts</span>
        </div>
      </div>
    </details>
  )
}
```

- [ ] **Step 2: Create team selector for draft mode**

Create `components/team-selector.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { chooseTeam } from '@/actions/draft'

type Team = { id: string; name: string; flag_emoji: string }

export function TeamSelector({
  pot,
  teams,
  currentTeamId,
  playerToken,
}: {
  pot: 2 | 3 | 4
  teams: Team[]
  currentTeamId: string | null
  playerToken: string
}) {
  const [selected, setSelected] = useState<string | null>(currentTeamId)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleChoose(teamId: string) {
    setLoading(teamId)
    setError(null)
    try {
      await chooseTeam(playerToken, teamId, pot)
      setSelected(teamId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao escolher equipa')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs uppercase tracking-wider">
        Pote {pot} — {selected ? 'escolhido' : 'escolhe uma equipa'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {teams.map(team => {
          const isSelected = selected === team.id
          return (
            <button
              key={team.id}
              onClick={() => handleChoose(team.id)}
              disabled={!!loading}
              className={`
                flex items-center gap-2 px-3 py-2 rounded border text-sm transition-colors
                ${isSelected
                  ? 'border-gold bg-gold-muted text-gold font-semibold'
                  : 'border-night-border bg-night text-foreground hover:border-gold/50'
                }
              `}
            >
              <span className="text-base">{team.flag_emoji}</span>
              <span className="truncate">{team.name}</span>
              {loading === team.id && (
                <span className="ml-auto text-muted-foreground text-xs">...</span>
              )}
            </button>
          )
        })}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Create team tab page**

Create `app/play/[token]/team/page.tsx`:
```typescript
import { notFound } from 'next/navigation'
import { getPlayerByToken } from '@/actions/players'
import { getPlayerTeams } from '@/actions/draft'
import { getCompetition } from '@/actions/competition'
import { createAdminClient } from '@/lib/supabase/admin'
import { TeamCard } from '@/components/team-card'
import { TeamSelector } from '@/components/team-selector'
import { getScoreBreakdown } from '@/lib/scoring'
import type { TeamProgress, StageReached } from '@/lib/types'

async function getTeamsByPot(pot: number) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('teams')
    .select('id, name, flag_emoji')
    .eq('pot', pot)
    .order('name', { ascending: true })
  return data ?? []
}

export default async function TeamPage({
  params,
}: {
  params: { token: string }
}) {
  const player = await getPlayerByToken(params.token)
  if (!player) notFound()

  const [competition, myTeams] = await Promise.all([
    getCompetition(),
    getPlayerTeams(player.id),
  ])

  const isDraft = competition.status === 'draft'

  if (isDraft) {
    // Draft mode: show pot 1 (assigned) + selectors for pots 2/3/4
    const pot1Assignment = myTeams?.find(pt => pt.pot === 1)
    const [pot2Teams, pot3Teams, pot4Teams] = await Promise.all([
      getTeamsByPot(2),
      getTeamsByPot(3),
      getTeamsByPot(4),
    ])

    const getChoice = (pot: number) => myTeams?.find(pt => pt.pot === pot)

    return (
      <div className="py-4 space-y-6">
        {/* Pot 1 (assigned by draw) */}
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">
            Pote 1 — sorteio
          </p>
          {pot1Assignment ? (
            <div className="flex items-center gap-3 rounded border border-gold/30 bg-gold-muted px-4 py-3">
              <span className="text-2xl">{(pot1Assignment.teams as any).flag_emoji}</span>
              <span className="text-gold font-semibold">{(pot1Assignment.teams as any).name}</span>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Aguarda o sorteio do administrador.
            </p>
          )}
        </div>

        {/* Pot 2 */}
        <TeamSelector
          pot={2}
          teams={pot2Teams}
          currentTeamId={getChoice(2) ? (getChoice(2)!.teams as any).id : null}
          playerToken={params.token}
        />

        {/* Pot 3 */}
        <TeamSelector
          pot={3}
          teams={pot3Teams}
          currentTeamId={getChoice(3) ? (getChoice(3)!.teams as any).id : null}
          playerToken={params.token}
        />

        {/* Pot 4 */}
        <TeamSelector
          pot={4}
          teams={pot4Teams}
          currentTeamId={getChoice(4) ? (getChoice(4)!.teams as any).id : null}
          playerToken={params.token}
        />
      </div>
    )
  }

  // Locked/Running/Finished: show team cards with score breakdown
  if (!myTeams || myTeams.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Ainda não foram registadas equipas.
      </div>
    )
  }

  return (
    <div className="py-4 space-y-3">
      {myTeams
        .sort((a, b) => a.pot - b.pot)
        .map(pt => {
          const team = pt.teams as any
          const progress: TeamProgress = team.team_progress?.[0] ?? {
            team_id: team.id,
            group_wins: 0,
            group_draws: 0,
            stage_reached: 'group_stage' as StageReached,
            is_champion: false,
            updated_at: '',
          }
          const breakdown = getScoreBreakdown(progress, pt.pot)
          return (
            <TeamCard
              key={pt.player_team_id}
              name={team.name}
              flagEmoji={team.flag_emoji}
              pot={pt.pot}
              progress={progress}
              breakdown={breakdown}
            />
          )
        })}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/play/ components/team-card.tsx components/team-selector.tsx
git commit -m "feat: add player team tab with score breakdown and draft selectors"
```

---

## Task 15: Player Area — Rankings & Selections Tabs

**Files:**
- Create: `app/play/[token]/ranking/page.tsx`
- Create: `app/play/[token]/selections/page.tsx`

- [ ] **Step 1: Create rankings tab**

Create `app/play/[token]/ranking/page.tsx`:
```typescript
import { notFound } from 'next/navigation'
import { getPlayerByToken } from '@/actions/players'
import { getRankings } from '@/actions/results'
import { getCompetition } from '@/actions/competition'
import { RankingTable } from '@/components/ranking-table'
import { SyncIndicator } from '@/components/sync-indicator'

export default async function RankingPage({
  params,
}: {
  params: { token: string }
}) {
  const player = await getPlayerByToken(params.token)
  if (!player) notFound()

  const [rankings, competition] = await Promise.all([
    getRankings(),
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
        <RankingTable rankings={rankings} expandedId={player.id} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create selections tab**

Create `app/play/[token]/selections/page.tsx`:
```typescript
import { notFound } from 'next/navigation'
import { getPlayerByToken } from '@/actions/players'
import { getAllTeamsWithProgress } from '@/actions/results'
import { getScoreBreakdown } from '@/lib/scoring'
import type { TeamProgress, StageReached } from '@/lib/types'

const STAGE_LABELS: Record<string, string> = {
  group_stage: 'Fase de Grupos',
  r32: '1/16 de Final',
  r16: '1/8 de Final',
  qf: 'Quartos de Final',
  sf: 'Meia-Final',
  final: 'Final',
  champion: 'Campeão 🏆',
}

export default async function SelectionsPage({
  params,
}: {
  params: { token: string }
}) {
  const player = await getPlayerByToken(params.token)
  if (!player) notFound()

  const teams = await getAllTeamsWithProgress()

  return (
    <div className="py-4 space-y-4">
      <h2 className="text-foreground font-semibold">Todas as Seleções</h2>
      {[1, 2, 3, 4].map(pot => (
        <div key={pot}>
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">
            Pote {pot}
          </p>
          <div className="space-y-1">
            {teams
              .filter(t => t.pot === pot)
              .map(team => {
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
                    <span className="text-foreground text-sm flex-1 truncate">
                      {team.name}
                    </span>
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

- [ ] **Step 3: Verify full player area**

```bash
npm run dev
```
Create a player in admin, advance to draft, visit their link.
Expected: Tab bar works, draft shows team selectors, ranking + selections tabs render.

- [ ] **Step 4: Final build check**

```bash
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add app/play/[token]/ranking/ app/play/[token]/selections/
git commit -m "feat: add player ranking and selections tabs"
```

---

## Task 16: Supabase Edge Function — Auto-Sync

**Files:**
- Create: `supabase/functions/sync-results/index.ts`

- [ ] **Step 1: Create Edge Function**

Create `supabase/functions/sync-results/index.ts`:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FOOTBALL_DATA_API_KEY = Deno.env.get('FOOTBALL_DATA_API_KEY')!
const SYNC_SECRET = Deno.env.get('SYNC_SECRET')!

// football-data.org stage → our stage_reached enum
// "team played in this round and was eliminated here"
const FD_STAGE_MAP: Record<string, string> = {
  LAST_32: 'r32',
  LAST_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  FINAL: 'final', // loser of final
}

// winning this round means the team advanced to:
const FD_WINNER_ADVANCES_TO: Record<string, string> = {
  LAST_32: 'r16',
  LAST_16: 'qf',
  QUARTER_FINALS: 'sf',
  SEMI_FINALS: 'final',
  FINAL: 'champion',
}

Deno.serve(async (req: Request) => {
  // Validate secret (for manual triggers from admin panel)
  const incomingSecret = req.headers.get('x-sync-secret')
  if (incomingSecret !== SYNC_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // Fetch all World Cup 2026 matches
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
    const matches: any[] = fdData.matches ?? []

    // No finished matches today → lightweight exit
    const finishedMatches = matches.filter((m: any) => m.status === 'FINISHED')
    if (finishedMatches.length === 0) {
      return new Response(JSON.stringify({ synced: 0, message: 'No finished matches' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch all teams from our DB (keyed by api_id)
    const { data: dbTeams, error: teamsError } = await supabase
      .from('teams')
      .select('id, api_id, pot')

    if (teamsError || !dbTeams) throw teamsError ?? new Error('Failed to fetch teams')

    // Map api_id → { id, pot }
    const teamMap = new Map<number, { id: string; pot: number }>()
    for (const t of dbTeams) {
      if (t.api_id) teamMap.set(t.api_id, { id: t.id, pot: t.pot })
    }

    // Accumulate per-team progress
    const teamStats = new Map<
      string,
      { group_wins: number; group_draws: number; stage_reached: string; is_champion: boolean }
    >()

    for (const t of dbTeams) {
      teamStats.set(t.id, {
        group_wins: 0,
        group_draws: 0,
        stage_reached: 'group_stage',
        is_champion: false,
      })
    }

    for (const match of finishedMatches) {
      const homeApiId = match.homeTeam?.id
      const awayApiId = match.awayTeam?.id
      const stage: string = match.stage
      const winner: string | null = match.score?.winner ?? null // HOME_TEAM | AWAY_TEAM | DRAW | null

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
        // Knockout: loser gets "eliminated at this stage", winner advances
        const loserStage = FD_STAGE_MAP[stage]
        const winnerStage = FD_WINNER_ADVANCES_TO[stage]

        if (winner === 'HOME_TEAM') {
          if (awayDb) {
            const s = teamStats.get(awayDb.id)!
            s.stage_reached = loserStage
          }
          if (homeDb) {
            const s = teamStats.get(homeDb.id)!
            s.stage_reached = winnerStage
            if (winnerStage === 'champion') s.is_champion = true
          }
        } else if (winner === 'AWAY_TEAM') {
          if (homeDb) {
            const s = teamStats.get(homeDb.id)!
            s.stage_reached = loserStage
          }
          if (awayDb) {
            const s = teamStats.get(awayDb.id)!
            s.stage_reached = winnerStage
            if (winnerStage === 'champion') s.is_champion = true
          }
        }
      }
    }

    // Upsert team_progress
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

    // Update last_synced_at
    await supabase
      .from('competition')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', 1)

    return new Response(
      JSON.stringify({ synced: finishedMatches.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('sync-results error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 2: Set Edge Function env vars in Supabase**

In Supabase Dashboard → Edge Functions → Environment Variables, add:
```
FOOTBALL_DATA_API_KEY = <from .env.local>
SYNC_SECRET = <from .env.local>
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase.

- [ ] **Step 3: Deploy Edge Function**

```bash
npx supabase functions deploy sync-results --project-ref <your-project-ref>
```

- [ ] **Step 4: Populate api_id for all teams**

Run in the Supabase SQL Editor to find football-data.org team IDs.
First, query the World Cup 2026 teams from football-data.org in your browser:
```
GET https://api.football-data.org/v4/competitions/WC/teams?season=2026
Header: X-Auth-Token: <your key>
```
Then run a SQL update for each team mapping. Example (repeat for all 48 teams):
```sql
update teams set api_id = 765 where name = 'Portugal';
update teams set api_id = 759 where name = 'Alemanha';
update teams set api_id = 764 where name = 'Brasil';
update teams set api_id = 762 where name = 'Argentina';
update teams set api_id = 773 where name = 'França';
update teams set api_id = 760 where name = 'Espanha';
update teams set api_id = 770 where name = 'Inglaterra';
-- ... continue for all 48 teams using IDs from the API response
```

- [ ] **Step 5: Test manual sync**

In admin panel, advance competition to `running`, then click "Sincronizar agora".
Expected: No error. Check `team_progress` in Supabase — `updated_at` should be recent.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add sync-results Supabase Edge Function"
```

---

## Task 17: pg_cron Schedule

**Files:** (Supabase Dashboard SQL only — no files)

- [ ] **Step 1: Enable pg_cron extension**

In Supabase Dashboard → Database → Extensions, enable `pg_cron` and `pg_net`.

- [ ] **Step 2: Schedule the sync**

Run in Supabase SQL Editor:
```sql
-- Schedule sync-results every 30 minutes during World Cup 2026
-- (11 Jun – 19 Jul 2026)
select cron.schedule(
  'sync-wc-results',
  '*/30 * * * *',
  $$
    select net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/sync-results',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-secret', current_setting('app.sync_secret')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

- [ ] **Step 3: Set app config vars in Supabase**

Run in SQL Editor:
```sql
alter database postgres set "app.supabase_url" = 'https://<your-project-ref>.supabase.co';
alter database postgres set "app.sync_secret" = '<your SYNC_SECRET>';
```

- [ ] **Step 4: Verify cron is scheduled**

```sql
select * from cron.job;
```
Expected: One row with jobname = 'sync-wc-results', schedule = '*/30 * * * *'.

- [ ] **Step 5: Unschedule after World Cup ends (19 Jul 2026)**

After the tournament, run:
```sql
select cron.unschedule('sync-wc-results');
```

---

## Task 18: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Import project in Vercel**

In Vercel Dashboard → New Project → Import from GitHub → select `puras_cinderelas`.

- [ ] **Step 3: Set environment variables in Vercel**

In Vercel → Project → Settings → Environment Variables, add all vars from `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_SECRET
FOOTBALL_DATA_API_KEY
SYNC_SECRET
```

- [ ] **Step 4: Deploy**

Vercel auto-deploys on push. Verify at `https://puras-cinderelas.vercel.app`.

- [ ] **Step 5: Smoke test production**

- Visit `/` → rankings visible (or "em preparação")
- Visit `/admin?token=<ADMIN_SECRET>` → admin panel accessible
- Create a player → copy their link → visit it → tab bar works
- Advance to draft → run draw → player sees their Pot 1 team

---

## Self-Review Notes

After writing this plan, cross-checking against the spec:

- ✅ Competition states (setup → draft → locked → running → finished): Task 7
- ✅ Pote 1 draw (random, button-triggered): Task 8
- ✅ Player token auth + private links: Tasks 3, 7, 13
- ✅ Draft: team selection for pots 2/3/4: Task 14
- ✅ Scoring engine with group stage + knockout + Cinderela bonus (cumulative): Task 4
- ✅ Score breakdown per team (group wins, knockout, bonus): Task 14
- ✅ Ranking with tiebreakers (5 levels): Task 11
- ✅ Admin results editor (manual per-team update): Task 9/10
- ✅ Auto-sync via Supabase Edge Function + football-data.org: Task 16
- ✅ pg_cron 30-min schedule: Task 17
- ✅ "Próxima atualização em X min" indicator: Task 11
- ✅ Admin "Sincronizar agora" button: Task 10
- ✅ Admin shows last sync timestamp + failure state: Task 10
- ✅ Dark & Premium theme, Portuguese UI, mobile-first: Tasks 5, 13
- ✅ Ranking table expandable rows (click to see team breakdown): Task 11
- ✅ `api_id` on teams for football-data.org mapping: Task 2/16
