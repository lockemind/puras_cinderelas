# Puras Cinderelas 2026

A private fantasy football prediction game for the FIFA World Cup 2026. 12 participants each build a squad of 4 national teams — one drawn at random from Pot 1, three chosen freely from Pots 2–4 — and accumulate points based on how far those teams go in the tournament.

The game rewards both luck (the Pot 1 draw) and strategy (spotting "cinderelas" — underdogs who outperform expectations).

---

## The Game

### Pots

There are 4 pots of 12 teams each:

| Pot | Teams | Assignment |
|-----|-------|-----------|
| 1 | Top favourites (Brazil, Spain, France…) | Random draw — each team assigned to exactly one player |
| 2 | Strong contenders (Morocco, Japan, Colombia…) | Free choice — duplicates allowed |
| 3 | Underdogs (Norway, Egypt, Scotland…) | Free choice — duplicates allowed |
| 4 | Long shots (Cape Verde, Haiti, Iraq…) | Free choice — duplicates allowed |

### Scoring

**Group stage**

| Result | Points |
|--------|--------|
| Win | 3 |
| Draw | 1 |

**Knockout rounds** — points awarded for each win:

| Round won | Points |
|-----------|--------|
| Round of 32 (1/16) | 5 |
| Round of 16 (1/8) | 8 |
| Quarter-final | 12 |
| Semi-final | 15 |
| Final (champion) | 25 |

**Cinderela bonus** — extra points for Pot 3 and Pot 4 teams that beat expectations:

| Milestone reached | Pot 3 bonus | Pot 4 bonus |
|------------------|-------------|-------------|
| Round of 32 | +3 | +5 |
| Round of 16 | +7 | +10 |
| Quarter-final | +10 | +15 |
| Semi-final | +15 | +20 |
| Final | +20 | +25 |
| Champion | +25 | +30 |

Bonuses are **cumulative** — a Pot 4 team reaching the final earns all milestones above it (5 + 10 + 15 + 20 + 25 = +75).

### Prizes

| Position | Prize |
|----------|-------|
| 1st | 70% of the pot |
| 2nd | 20% |
| 3rd | 10% |

### Tiebreakers

1. Most world champions
2. Most finalists
3. Most semi-finalists
4. Most quarter-finalists
5. Draw

---

## Competition States

The competition moves through a fixed one-way flow:

```
setup → draft → locked → running → finished
```

| State | What's happening |
|-------|-----------------|
| `setup` | Admin creates players and configures the competition |
| `draft` | Pot 1 draw has been run; players choose their Pot 2/3/4 teams |
| `locked` | Picks are frozen; the World Cup is about to start |
| `running` | Tournament is live; scores update automatically |
| `finished` | Tournament over; final standings are frozen |

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend | Next.js Server Actions |
| Database | PostgreSQL via Supabase |
| Edge functions | Deno (Supabase Edge Functions) |
| Hosting | Vercel |
| Score data | [football-data.org](https://www.football-data.org) API |

### Authentication

There is no formal login. Players access their private area via a unique URL token: `/play/<token>`. Tokens are auto-generated UUIDs stored in the `players` table. The admin panel at `/admin` is unprotected by auth — keep the URL private.

### Automatic sync

Two Supabase Edge Functions run on a schedule via `pg_cron`:

- **`sync-results`** — every 30 minutes, pulls finished matches from football-data.org and updates `team_progress`
- **`sync-fixtures`** — daily at midnight UTC, syncs the match schedule

Manual sync is also available from the admin panel.

---

## Project Structure

```
app/
  page.tsx                         # Public home: competition status + global ranking
  admin/
    page.tsx                       # Admin panel (players, draw, results)
  play/[token]/
    team/page.tsx                  # Player's squad and score breakdown
    ranking/page.tsx               # Global ranking (player view)
    selections/page.tsx            # Fixture list
    selections/[fixtureId]/page.tsx # Fixture detail with player ownership

actions/                           # Next.js Server Actions
  competition.ts                   # Status transitions
  draft.ts                         # Pot 1 draw and team selection
  fixtures.ts                      # Fixture queries and sync trigger
  players.ts                       # Player CRUD
  results.ts                       # Score queries, team progress updates, sync trigger

lib/
  scoring.ts                       # Score and Cinderela bonus calculation
  types.ts                         # Shared TypeScript types
  fixtures.ts                      # Fixture helpers
  draw-utils.ts                    # Pot 1 draw randomisation
  supabase/
    admin.ts                       # Supabase service-role client
    types.ts                       # Generated database types

supabase/
  migrations/                      # SQL migrations (apply in order)
  functions/
    sync-results/index.ts          # Edge function: update team progress from API
    sync-fixtures/index.ts         # Edge function: sync match schedule

spec/                              # Original game and tech specification
docs/                              # Additional documentation
```

---

## Local Development Setup

### Prerequisites

- Node.js 20 (`cat .nvmrc` — use `nvm use` if you have nvm)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- A Supabase project (free tier works)
- A [football-data.org](https://www.football-data.org) API key (free tier)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example and fill in your values:

```bash
cp .env.local.example .env.local   # or create .env.local from scratch
```

Required variables:

```env
# Supabase — from your project dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Secret used to authenticate calls to the sync Edge Functions
SYNC_SECRET=<generate a random string, e.g. openssl rand -hex 32>

# football-data.org API key (for auto-sync Edge Functions)
FOOTBALL_DATA_API_KEY=<your-key>

# Admin panel password (not yet enforced in MVP — keep the /admin URL private)
ADMIN_SECRET=<any-string>

# Supabase database password (used by Supabase CLI for migrations)
DB_PASS=<db-password-from-supabase-dashboard>
```

### 3. Set up the database

Link the Supabase CLI to your project:

```bash
supabase link --project-ref <your-project-ref>
```

Apply migrations in order:

```bash
supabase db push
```

The migrations will:
1. Create all tables (`competition`, `players`, `teams`, `player_teams`, `team_progress`, `score_entries`, `fixtures`)
2. Seed all 48 World Cup teams across the 4 pots
3. Create the fixtures table
4. Add mascot image columns
5. Register `pg_cron` jobs for automatic sync

> **Note:** Migration 005 (`cron_jobs.sql`) contains hardcoded values for this specific Supabase project. If you're running a fresh project, update the `url` and `x-sync-secret` values in that file before applying.

### 4. Deploy Edge Functions

```bash
supabase functions deploy sync-results
supabase functions deploy sync-fixtures
```

Set the required secrets on Supabase:

```bash
supabase secrets set FOOTBALL_DATA_API_KEY=<your-key>
supabase secrets set SYNC_SECRET=<same-value-as-in-.env.local>
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Running the Competition

### Phase 1 — Setup

1. Go to `/admin`
2. Create all 12 player accounts using **Players Manager**. Each player gets a unique token automatically.
3. Share each player's private URL: `https://<your-domain>/play/<token>`

### Phase 2 — Draft

1. In `/admin`, advance the competition to **draft** status
2. Run the **Pot 1 draw** — assigns one top-tier team to each player at random
3. Players visit their private URLs and pick their Pot 2, 3, and 4 teams

### Phase 3 — Lock picks

1. Once all players have submitted their choices, advance to **locked** status
2. Picks can no longer be changed

### Phase 4 — Running

1. Advance to **running** when the World Cup begins
2. Scores update automatically every 30 minutes via `pg_cron` + `sync-results`
3. Manual sync is available from the admin panel if needed
4. The public home page (`/`) shows the live ranking

### Phase 5 — Finished

1. Advance to **finished** after the final
2. The ranking is frozen

---

## Deployment

The app is deployed to Vercel. Set all environment variables from step 2 in your Vercel project settings.

```bash
vercel --prod
```

The database and Edge Functions live in Supabase and are not affected by Vercel deployments.

---

## Mascot Images

Each team can have an AI-generated mascot image. See [docs/process-mascots.md](docs/process-mascots.md) for the pipeline to prepare images from source PNGs.

---

## Tests

```bash
npm test          # run once
npm run test:watch  # watch mode
```

Tests cover the scoring engine (`lib/scoring.ts`), draw utilities, and fixture helpers.
