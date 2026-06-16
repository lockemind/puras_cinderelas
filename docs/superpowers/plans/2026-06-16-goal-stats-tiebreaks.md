# Goal Stats & Tiebreak Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `games_played` to goal stats, thread per-team goal stats through the data layer and all player-facing UI components using a compact `3(5/2)` display format.

**Architecture:** The core tiebreak logic and goal stats computation (`lib/ranking.ts`) already exist and are tested. This plan wires `games_played` into that module, threads per-team stats through `actions/results.ts` into the UI, and updates 4 display components.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Vitest

---

## File Structure

| File | Role | Action |
|------|------|--------|
| `lib/ranking.ts` | Goal stats computation + tiebreak comparator | Modify: add `gamesPlayed` |
| `lib/__tests__/ranking.test.ts` | Tests for goal stats + tiebreak | Modify: add `gamesPlayed` assertions |
| `actions/results.ts` | Data pipeline: `getRankings()`, `getAllTeamsWithProgress()` | Modify: thread per-team goal stats, expose `gamesPlayed` |
| `components/ranking-table.tsx` | Player ranking UI (Jogadores tab) | Modify: show stats on rows, podium, details |
| `components/team-standings.tsx` | Team ranking UI (Seleções tab) | Modify: show stats per team row |
| `components/team-card.tsx` | Player's team detail cards | Modify: show stats on summary + breakdown |
| `README.md` | Game rules documentation | Modify: update tiebreakers section |

---

### Task 1: Add `gamesPlayed` to `lib/ranking.ts`

**Files:**
- Modify: `lib/ranking.ts`
- Modify: `lib/__tests__/ranking.test.ts`

- [ ] **Step 1: Update the test to expect `gamesPlayed`**

In `lib/__tests__/ranking.test.ts`, update the existing `computeTeamGoalStats` test assertions to include `gamesPlayed`:

```ts
// In the first test "aggregates goals scored and conceded..."
expect(stats.get('por')).toEqual({ gamesPlayed: 2, goalsFor: 5, goalsAgainst: 1 })
expect(stats.get('bra')).toEqual({ gamesPlayed: 1, goalsFor: 1, goalsAgainst: 2 })
expect(stats.get('jpn')).toEqual({ gamesPlayed: 1, goalsFor: 0, goalsAgainst: 3 })

// In the second test "sums aggregate goal stats..."
expect(sumGoalStats(['a', 'd'], stats)).toEqual({ gamesPlayed: 2, goalsFor: 6, goalsAgainst: 1 })
```

Also update the `entry()` helper to include `gamesPlayed: 0`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use && npx vitest run lib/__tests__/ranking.test.ts`
Expected: FAIL — `gamesPlayed` property missing from actual results.

- [ ] **Step 3: Add `gamesPlayed` to `GoalStats` type and computation**

In `lib/ranking.ts`, update the `GoalStats` type:

```ts
export type GoalStats = {
  gamesPlayed: number
  goalsFor: number
  goalsAgainst: number
}
```

Update `computeTeamGoalStats` — change the `ensure` initializer and add increment:

```ts
const ensure = (teamId: string) => {
  if (!stats.has(teamId)) stats.set(teamId, { gamesPlayed: 0, goalsFor: 0, goalsAgainst: 0 })
  return stats.get(teamId)!
}

// Inside the loop, after the null check, before goal tallies:
if (fixture.home_team_id) {
  const home = ensure(fixture.home_team_id)
  home.gamesPlayed++
  home.goalsFor += fixture.home_score
  home.goalsAgainst += fixture.away_score
}

if (fixture.away_team_id) {
  const away = ensure(fixture.away_team_id)
  away.gamesPlayed++
  away.goalsFor += fixture.away_score
  away.goalsAgainst += fixture.home_score
}
```

Update `sumGoalStats` — add `gamesPlayed` to the reducer:

```ts
export function sumGoalStats(teamIds: string[], statsByTeam: Map<string, GoalStats>): GoalStats {
  return teamIds.reduce(
    (total, teamId) => {
      const teamStats = statsByTeam.get(teamId)
      if (!teamStats) return total

      return {
        gamesPlayed: total.gamesPlayed + teamStats.gamesPlayed,
        goalsFor: total.goalsFor + teamStats.goalsFor,
        goalsAgainst: total.goalsAgainst + teamStats.goalsAgainst,
      }
    },
    { gamesPlayed: 0, goalsFor: 0, goalsAgainst: 0 }
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `source ~/.nvm/nvm.sh && nvm use && npx vitest run lib/__tests__/ranking.test.ts`
Expected: PASS — all ranking tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/ranking.ts lib/__tests__/ranking.test.ts
git commit -m "feat: add gamesPlayed to goal stats computation"
```

---

### Task 2: Thread per-team goal stats through `actions/results.ts`

**Files:**
- Modify: `actions/results.ts`

Currently `getRankings()` already computes `goalStatsByTeam` and spreads player-level aggregates. But individual team entries in `teamsWithScores` don't carry their own goal stats. We need to attach per-team stats so UI components can display `3(5/2)` per team.

- [ ] **Step 1: Attach per-team goal stats in `getRankings()`**

In `actions/results.ts`, inside the `teamsWithScores.map()` block (around line 202), add goal stats to each team entry. After the `breakdown` assignment, look up the team's stats:

```ts
const teamGoalStats = goalStatsByTeam.get(team.id) ?? { gamesPlayed: 0, goalsFor: 0, goalsAgainst: 0 }
```

Then include it in the return object:

```ts
return {
  team: { id: team.id, name: team.name, pot: team.pot, flag_emoji: team.flag_emoji, mascot: (team.mascot ?? null) as string | null },
  pot: pt.pot,
  progress,
  breakdown,
  goalStats: teamGoalStats,
}
```

- [ ] **Step 2: Thread goal stats through `getAllTeamsWithProgress()`**

This function is used by the Seleções tab. It currently returns teams with `team_progress` but no goal stats. Add `computeTeamGoalStats` call and attach stats per team.

Import `computeTeamGoalStats` at the top of the file (it's already imported for `getRankings`; verify it's there):

```ts
import { computeTeamGoalStats } from '@/lib/ranking'
```

Update `getAllTeamsWithProgress()` to also fetch fixtures and compute goal stats:

```ts
export async function getAllTeamsWithProgress() {
  const supabase = createAdminClient()
  const [{ data, error }, finishedFixtures] = await Promise.all([
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
    fetchFinishedFixtureRows(),
  ])

  if (error) throw error

  const liveStats = computeTeamStatsFromFixtures(finishedFixtures)
  const goalStatsByTeam = computeTeamGoalStats(finishedFixtures)

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
```

Note: `fetchLiveStats()` was calling `fetchFinishedFixtureRows()` internally. We refactor to call `fetchFinishedFixtureRows()` once and compute both `liveStats` and `goalStatsByTeam` from the same data — same pattern already used in `getRankings()`.

- [ ] **Step 3: Run full test suite**

Run: `source ~/.nvm/nvm.sh && nvm use && npm test -- --run`
Expected: PASS — all tests green. TypeScript may show errors in consuming components (they'll be fixed in subsequent tasks).

- [ ] **Step 4: Commit**

```bash
git add actions/results.ts
git commit -m "feat: thread per-team goal stats through data layer"
```

---

### Task 3: Update `ranking-table.tsx` — show stats on all views

**Files:**
- Modify: `components/ranking-table.tsx`

This component receives `RankingEntryWithDelta[]`. After Task 2, each entry has `gamesPlayed`, `goalsFor`, `goalsAgainst` at the player level, and each team in `entry.teams[n]` has `goalStats`.

**Reference:** The `GoalStats` type is `{ gamesPlayed: number; goalsFor: number; goalsAgainst: number }` from `lib/ranking.ts`.

- [ ] **Step 1: Add a compact stat helper component**

At the top of the file (after imports), add:

```tsx
import type { GoalStats } from '@/lib/ranking'

function CompactStats({ stats, className }: { stats: GoalStats; className?: string }) {
  return (
    <span className={`text-[11px] tabular-nums text-muted-foreground ${className ?? ''}`}>
      {stats.gamesPlayed}({stats.goalsFor}/{stats.goalsAgainst})
    </span>
  )
}
```

- [ ] **Step 2: Add aggregate stats to `RowHeader`**

In the `RowHeader` component, add `<CompactStats>` between the `<Delta>` and the score `<span>`. The entry already carries `goalsFor`, `goalsAgainst`, `gamesPlayed` at the top level:

```tsx
<Delta delta={entry.rankDelta} />
<CompactStats stats={{ gamesPlayed: entry.gamesPlayed, goalsFor: entry.goalsFor, goalsAgainst: entry.goalsAgainst }} />
<span
  className={`text-sm tabular-nums text-gold ${
    isCurrentPlayer ? 'font-extrabold' : 'font-bold'
  }`}
>
  {entry.totalScore}
</span>
```

- [ ] **Step 3: Add per-team stats to `TeamsDetail`**

In the `TeamsDetail` component, each team `t` now has `t.goalStats`. Add the compact stat after the stage label:

```tsx
<span className="text-xs text-muted-foreground">
  {STAGE_SHORT[t.progress.stage_reached] ?? t.progress.stage_reached}
</span>
<CompactStats stats={t.goalStats} />
<span className="text-xs font-semibold tabular-nums text-gold">
  {t.breakdown.total} pts
</span>
```

- [ ] **Step 4: Add aggregate stats to podium cards**

In `PodiumCard`, add the compact stat below the score for both the `place === 1` card and the `place 2/3` cards.

For the 1st place card, after the score `<p>`:

```tsx
<p className="text-xl font-extrabold tabular-nums text-gold">{entry.totalScore}</p>
<CompactStats stats={{ gamesPlayed: entry.gamesPlayed, goalsFor: entry.goalsFor, goalsAgainst: entry.goalsAgainst }} />
```

For the 2nd/3rd place cards, same pattern after the score:

```tsx
<p className="text-base font-bold tabular-nums text-gold">{entry.totalScore}</p>
<CompactStats stats={{ gamesPlayed: entry.gamesPlayed, goalsFor: entry.goalsFor, goalsAgainst: entry.goalsAgainst }} />
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `source ~/.nvm/nvm.sh && nvm use && npx tsc --noEmit`
Expected: No errors related to ranking-table.tsx.

- [ ] **Step 6: Commit**

```bash
git add components/ranking-table.tsx
git commit -m "feat: show goal stats on ranking table rows, podium, and details"
```

---

### Task 4: Update `team-standings.tsx` — show stats per team

**Files:**
- Modify: `components/team-standings.tsx`

After Task 2, `getAllTeamsWithProgress()` returns each team with a `goalStats` property.

- [ ] **Step 1: Add compact stat to team rows**

Import `GoalStats` and add the stat between stage label and points. The `teams` prop type is `Awaited<ReturnType<typeof getAllTeamsWithProgress>>`, so each team now has `team.goalStats`.

```tsx
import type { GoalStats } from '@/lib/ranking'
```

In the team row JSX, after the stage `<span>` and before the points `<span>`:

```tsx
<span className="text-muted-foreground text-xs">
  {STAGE_LABELS[progress.stage_reached] ?? progress.stage_reached}
</span>
<span className="text-[11px] tabular-nums text-muted-foreground">
  {team.goalStats.gamesPlayed}({team.goalStats.goalsFor}/{team.goalStats.goalsAgainst})
</span>
<span className="text-gold text-xs font-semibold tabular-nums">
  {breakdown.total} pts
</span>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `source ~/.nvm/nvm.sh && nvm use && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/team-standings.tsx
git commit -m "feat: show goal stats on team standings rows"
```

---

### Task 5: Update `team-card.tsx` — show stats on summary and breakdown

**Files:**
- Modify: `components/team-card.tsx`
- Modify: `app/play/[token]/team/page.tsx` (to pass goal stats)

- [ ] **Step 1: Add `goalStats` prop to `TeamCard`**

Import `GoalStats` and add it to the component props:

```tsx
import type { GoalStats } from '@/lib/ranking'
```

Add to the destructured props:

```tsx
export function TeamCard({
  name,
  flagEmoji,
  mascot,
  pot,
  progress,
  breakdown,
  eliminated,
  goalStats,
}: {
  name: string
  flagEmoji: string
  mascot: string | null
  pot: number
  progress: TeamProgress
  breakdown: ScoreBreakdown
  eliminated: boolean
  goalStats: GoalStats
}) {
```

- [ ] **Step 2: Add compact stat to the subtitle line**

In the summary section, update the subtitle `<p>` to include the stat:

```tsx
<p className="text-xs text-muted-foreground">
  Pote {pot} · {stageLabel} · {goalStats.gamesPlayed}({goalStats.goalsFor}/{goalStats.goalsAgainst})
</p>
```

- [ ] **Step 3: Add verbose stats line to expanded breakdown**

At the top of the breakdown `<div>` (before the group stage line), add:

```tsx
<div className="flex justify-between">
  <span className="text-muted-foreground">
    Jogos: {goalStats.gamesPlayed} · Golos: {goalStats.goalsFor} marcados, {goalStats.goalsAgainst} sofridos
  </span>
</div>
```

- [ ] **Step 4: Pass `goalStats` from `team/page.tsx`**

In `app/play/[token]/team/page.tsx`, the `TeamCard` is rendered inside a `.map()` over `myTeams`. After Task 2, `getRankings()` returns per-team `goalStats`. Extract it from `rankingTeam`:

```tsx
const teamGoalStats = rankingTeam?.goalStats ?? { gamesPlayed: 0, goalsFor: 0, goalsAgainst: 0 }
```

Pass it to `TeamCard`:

```tsx
<TeamCard
  key={pt.id}
  name={team.name}
  flagEmoji={team.flag_emoji}
  mascot={team.mascot ?? null}
  pot={pt.pot}
  progress={progress}
  breakdown={breakdown}
  eliminated={isTeamEliminated(team.id, progress, fixtures)}
  goalStats={teamGoalStats}
/>
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `source ~/.nvm/nvm.sh && nvm use && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add components/team-card.tsx app/play/[token]/team/page.tsx
git commit -m "feat: show goal stats on team cards"
```

---

### Task 6: Update README.md tiebreakers section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the Tiebreakers section**

Replace lines 62-69 in `README.md`:

```markdown
### Tiebreakers

1. Most goals scored (aggregate of all 4 teams)
2. Fewest goals suffered (aggregate of all 4 teams)
3. Draw
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update tiebreaker rules to goal-based criteria"
```

---

### Task 7: Visual verification

- [ ] **Step 1: Start the dev server**

Run: `source ~/.nvm/nvm.sh && nvm use && npm run dev`

- [ ] **Step 2: Verify the ranking page (Jogadores tab)**

Navigate to a player's ranking page. Verify:
- Collapsed rows show `X(Y/Z)` between delta and score
- Podium cards show the stat below the score
- Expanded details show per-team stats

- [ ] **Step 3: Verify the ranking page (Seleções tab)**

Switch to the Seleções tab. Verify each team row shows the stat.

- [ ] **Step 4: Verify the team page**

Navigate to a player's team page. Verify:
- Team card summaries show the stat in the subtitle
- Expanded breakdown shows the verbose stats line

- [ ] **Step 5: Verify the public home page**

Navigate to `/`. Verify the ranking table shows stats (same component as Jogadores tab).

- [ ] **Step 6: Run full test suite**

Run: `source ~/.nvm/nvm.sh && nvm use && npm test -- --run`
Expected: All tests pass.
