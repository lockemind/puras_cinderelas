# Group-to-Knockout Hardening — Living Plan

> **For agentic workers:** This is a living internal tracker. Keep checklist items, evidence, and open questions current as implementation work progresses.

**Goal:** Prevent failures when the World Cup group phase ends, focused on points calculations, sync integrity, and team placement in elimination brackets.

**Architecture / Current State:** Scoring and elimination logic already live in pure TypeScript modules with Vitest coverage. Rankings recompute live progress from finished `fixtures` and merge it with stored `team_progress`. Knockout fixtures are currently consumed from synced `fixtures`; the app does not generate a first-class local bracket.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, Vitest

---

## Workstreams

### 1. End-of-Group Simulation Tests

- [x] Add fixture snapshots for the final group-stage window before every group is settled.
- [x] Add fixture snapshots for all groups settled with top-two qualifiers.
- [x] Add fixture snapshots for best-third-place qualification and eliminated third-place teams.
- [x] Assert player ranking totals from the simulation data.
- [x] Assert team elimination status before and after the first `LAST_32` fixtures appear.
- [x] Assert UI-facing stage labels and score breakdowns for qualified, eliminated, and pending teams.

### 2. Sync Consistency Checker

- [ ] Define a pure validation function for fixture/team/progress consistency.
- [ ] Flag API teams that are unmapped or mapped to duplicate DB teams.
- [ ] Flag unknown football-data.org stages and statuses that affect scoring or display.
- [ ] Flag finished fixtures with missing scores.
- [ ] Flag scheduled knockout fixtures with missing teams once official placements are available.
- [ ] Flag mismatches between recomputed progress and persisted `team_progress`.
- [ ] Expose validation results somewhere admin-visible before relying on sync output.

### 3. Safer Progress Recalculation

- [ ] Treat finished `fixtures` as the preferred source of truth for scoring where possible.
- [ ] Keep manual `team_progress` edits available as an override path for exceptional cases.
- [ ] Prevent stale synced progress from moving a team backwards after knockout progress exists.
- [ ] Add tests for progress merge behavior across group-stage, r32, and later knockout rounds.
- [ ] Document when persisted progress is cache-like data versus intentional manual correction.

### 4. Bracket Placement Guardrails

- [ ] Compute expected group qualifiers from group-stage fixtures for validation purposes.
- [ ] Compare computed qualifiers against official `LAST_32` fixtures after sync.
- [ ] Flag any qualified team missing from `LAST_32`.
- [ ] Flag any eliminated team present in `LAST_32`.
- [ ] Flag any team duplicated across multiple `LAST_32` fixtures.
- [ ] Avoid locally guessing official bracket placement unless a complete bracket matrix is explicitly implemented and tested.

### 5. Admin Transition Preview

- [ ] Add or design an admin-only transition preview for the group-to-knockout boundary.
- [ ] Show group standings and qualification state.
- [ ] Show projected player rankings using current finished fixtures.
- [ ] Show synced `LAST_32` fixtures and ownership impact.
- [ ] Show blocking validation warnings prominently.
- [ ] Include last sync time and whether data is complete enough to trust.

### 6. Rollback / Manual Correction Path

- [ ] Snapshot relevant progress/ranking state before sync updates that can affect standings.
- [ ] Make manual correction steps explicit for wrong scores, wrong team mapping, and wrong stage progression.
- [ ] Record how to compare pre-sync and post-sync ranking output.
- [ ] Ensure revalidation happens after corrections.
- [ ] Document the fastest safe recovery path if football-data.org returns malformed knockout data.

---

## Evidence Log

- 2026-06-26: Existing test suite verified with `source "$HOME/.nvm/nvm.sh" && nvm use && npm test -- --run`: 8 test files passed, 110 tests passed.
- 2026-06-26: Existing scoring and elimination logic found in pure modules under `lib/`, with focused Vitest coverage.
- 2026-06-26: Knockout fixtures are currently consumed from synced `fixtures`; no first-class local bracket generator was found.
- 2026-06-26: `fixtures` plus finished scores are already used to recompute live stats for ranking display.
- 2026-06-26: Added `lib/__tests__/group-to-knockout-transition.test.ts` covering pending final group fixtures, all-groups-settled qualification, best/worst third-place outcomes, `LAST_32` appearance/loss handling, ranking totals, and r32 Cinderela breakdown labels.
- 2026-06-26: Full test suite verified with `source "$HOME/.nvm/nvm.sh" && nvm use && npm test -- --run`: 9 test files passed, 114 tests passed.

## Open Questions

- [ ] Do we want the app to ever generate knockout bracket placement locally, or should official synced fixtures remain the only source of bracket placement?
- [ ] What should block admin trust: warnings only, or hard failures when validation detects missing/contradictory knockout data?
- [ ] Should manual corrections update only `fixtures`, only `team_progress`, or both with a clear precedence rule?
- [ ] Should sync snapshots live in a new database table, existing ranking snapshots, or exportable admin-only diagnostics?
