# Goal Stats & Tiebreak Redesign

## Summary

Replace the championship-based tiebreak system with a goal-based one, and display per-team and per-player goal statistics across all player-facing screens.

**New tiebreak criteria (when total score is equal):**
1. Most goals scored (aggregate across player's 4 teams)
2. Fewest goals suffered (aggregate across player's 4 teams)
3. Draw

**New stats tracked per team:**
- Games played
- Goals scored
- Goals suffered

**New stats tracked per player:**
- Aggregate of all 4 teams' games played, goals scored, goals suffered

## Approach

Compute all stats on-the-fly from the existing `fixtures` table (`home_score`/`away_score`). No schema migration needed — the data already exists.

## Data Layer

### `computeTeamStatsFromFixtures()` in `actions/results.ts`

Extend the stats map to include three new fields per team:

```ts
type TeamGoalStats = {
  games_played: number
  goals_scored: number
  goals_suffered: number
}
```

For each finished fixture:
- Both home and away team get `games_played++`
- Home team: `goals_scored += home_score`, `goals_suffered += away_score`
- Away team: `goals_scored += away_score`, `goals_suffered += home_score`

The return type of the stats map becomes `{ group_wins, group_draws, stage_reached, is_champion, games_played, goals_scored, goals_suffered }`.

### Threading through the data flow

- `fetchLiveStats()` returns the extended stats
- `mergeProgress()` in `lib/scoring.ts` merges the new fields alongside existing ones
- `getRankings()` exposes goal stats per team, computes player aggregates
- `getAllTeamsWithProgress()` exposes goal stats per team

### New type in `lib/types.ts`

Add `TeamGoalStats` type. Extend `TeamProgress` or keep separate — the stats flow alongside progress but are conceptually distinct. Decision: add the three fields directly to the stats map return type (not to the `TeamProgress` DB type, since these aren't stored in `team_progress`).

## Tiebreak Logic

### `getRankings()` in `actions/results.ts` (lines 218-234)

Replace the current sort tiebreaker:

```
Current: most champions → most finalists → most semi-finalists → most quarter-finalists → draw
New:     most goals scored → fewest goals suffered → draw
```

For each player, sum `goals_scored` and `goals_suffered` across their 4 teams, then compare.

### `README.md`

Update the Tiebreakers section to match the new rules.

### Rules page (`app/play/[token]/rules/page.tsx`)

Already updated — no changes needed.

## Display

### Compact format

Stats are displayed as `3(5/2)` — games(scored/suffered). Used in tight spaces.

### Ranking Table — Jogadores tab (`components/ranking-table.tsx`)

**Collapsed row:** Add player aggregate stat `3(5/2)` between rank delta and total score, in muted text.

**Expanded details (`TeamsDetail`):** Each team row adds the compact stat after the stage label:
`🇵🇹 Portugal  Quartos  3(5/2)  18 pts`

**Podium cards:** Add aggregate stat below the score in small muted text.

### Team Standings — Seleções tab (`components/team-standings.tsx`)

Each team row adds the compact stat between stage and points:
`🇵🇹 Portugal  Quartos de Final  3(5/2)  18 pts`

### Team Cards — Team page (`components/team-card.tsx`)

**Collapsed summary subtitle:** Add stat to the subtitle line:
`Pote 2 · Quartos de Final · 3(5/2)`

**Expanded breakdown:** Add a line at the top:
`Jogos: 3 · Golos: 5 marcados, 2 sofridos`

### Public Home Page (`app/page.tsx`)

Uses `RankingTable` — gets stats for free from the component changes.

### Fixture Detail Page

No changes — match score is already shown and sufficient.

## Files to Change

| File | Change |
|------|--------|
| `lib/types.ts` | Add `TeamGoalStats` type |
| `actions/results.ts` | Extend `computeTeamStatsFromFixtures()` with goal tallies, change tiebreak sort, thread stats through `getRankings()` and `getAllTeamsWithProgress()` |
| `lib/scoring.ts` | Extend `mergeProgress()` to handle new fields |
| `components/ranking-table.tsx` | Show stats on collapsed rows, expanded details, and podium cards |
| `components/team-standings.tsx` | Show stats per team row |
| `components/team-card.tsx` | Show stats on summary and expanded breakdown |
| `README.md` | Update tiebreakers section |

## Testing

- Extend existing scoring tests to verify goal stat computation
- Test tiebreak logic: same score → higher goals scored wins; same goals scored → fewer suffered wins; both equal → draw (stable sort)
- Verify stats aggregate correctly across player's 4 teams
