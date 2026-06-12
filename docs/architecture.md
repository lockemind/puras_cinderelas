# Architecture

## Overview

Puras Cinderelas is a server-rendered Next.js app backed by a Supabase (PostgreSQL) database. All database access happens server-side through Next.js Server Actions using the Supabase service-role key. There are no client-side API calls.

## Data Model

```
competition (singleton, id = 1)
  └─ status: setup | draft | locked | running | finished
  └─ last_synced_at

players
  └─ id (uuid)
  └─ name
  └─ access_token  ← unique hex token, becomes the player's URL

teams (48 World Cup nations, seeded in migration 002)
  └─ pot (1–4)
  └─ flag_emoji
  └─ api_id        ← football-data.org numeric ID for sync

player_teams (one row per player per pot)
  └─ player_id → players
  └─ team_id   → teams
  └─ pot (1–4)
  └─ UNIQUE(player_id, pot)

team_progress (one row per team, upserted by sync)
  └─ team_id      → teams (primary key)
  └─ group_wins
  └─ group_draws
  └─ stage_reached: group_stage | r32 | r16 | qf | sf | final | champion
  └─ is_champion

fixtures (match schedule)
  └─ api_id (unique, football-data.org match ID)
  └─ stage, group, utc_date, status
  └─ home_team_id, away_team_id → teams
  └─ home_score, away_score

score_entries (audit log, optional)
  └─ player_id, team_id, reason, points
```

RLS is disabled on all tables — the service-role key is only used server-side in Server Actions, never exposed to the browser.

## Scoring Engine

`lib/scoring.ts` is the single source of truth for all point calculations. It is a pure TypeScript module with no dependencies.

`getScoreBreakdown(progress, pot)` returns a full breakdown object:

```
{
  groupStagePoints     // wins×3 + draws×1
  knockoutPoints       // sum of points for each knockout win
  knockoutDetail       // [ { label, points } ] per round
  cinderelaBonusTotal  // cumulative bonus for pot 3/4 teams
  cinderelaBonusDetail // [ { label, points } ] per milestone
  total
}
```

The Cinderela bonus is **cumulative**: reaching each milestone earns the bonus for that milestone plus all lower ones, stacked. The `stage_reached` field encodes the furthest point in the tournament — `r16` means the team reached the round of 16 (i.e. won r32), so the player earns `+5` for the r32 win.

Stage order:
```
group_stage → r32 → r16 → qf → sf → final → champion
```

## Auto-Sync Flow

```
pg_cron (every 30 min)
  → POST /functions/v1/sync-results  (x-sync-secret header)
    → fetch football-data.org /v4/competitions/WC/matches?season=2026
    → build team stats from finished matches
    → upsert team_progress for all teams
    → update competition.last_synced_at
    → revalidatePath triggered on next app request
```

The `sync-fixtures` function runs the same pattern daily to keep the fixtures table current.

Both functions require:
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase runtime)
- `FOOTBALL_DATA_API_KEY` (set via `supabase secrets set`)
- `SYNC_SECRET` (must match the value in the Next.js app's env)

## Routes

| Route | Who sees it | Purpose |
|-------|-------------|---------|
| `/` | Everyone | Competition status + live ranking |
| `/play/[token]` | Player (token required) | Redirects to `/play/[token]/team` |
| `/play/[token]/team` | Player | Squad view + score breakdown per team |
| `/play/[token]/ranking` | Player | Global ranking with full score detail |
| `/play/[token]/selections` | Player | Fixture list |
| `/play/[token]/selections/[id]` | Player | Fixture detail + who owns each team |
| `/admin` | Admin (URL is the auth) | Competition controls, draw, results editor |

## Competition State Transitions

State advances forward only, one step at a time, via `advanceStatus()` in `actions/competition.ts`:

```
setup → draft → locked → running → finished → (null, terminal)
```

The admin panel shows different UI sections depending on the current state:
- `draft`: Pot 1 draw tool
- `locked` / `running` / `finished`: Results editor (manual score updates)

## Key Design Decisions

**No formal auth in MVP.** Players access their area via a secret link. The admin panel is at a known URL with no password. The `ADMIN_SECRET` env var is wired but not enforced in the current implementation.

**All data fetching is server-side.** Pages are `force-dynamic` server components; there is no SWR/React Query or polling on the client. Rankings refresh on page load.

**Single competition.** The `competition` table has a singleton constraint (`id = 1`). The app is built for one event, not multi-tenancy.

**Cinderela bonus starts at r32.** Pot 3/4 teams earn bonus points for reaching the Round of 32 (first knockout round), not just from the quarter-finals as in earlier game spec versions.
