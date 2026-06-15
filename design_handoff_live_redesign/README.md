# Handoff: Puras Cinderelas — Live-Phase Redesign (Equipa · Classificação · Jogos)

## Overview

Redesign of the three player-facing screens of **Puras Cinderelas 2026** (the private World Cup 2026 fantasy game at `puras-cinderelas.vercel.app`), optimized for the **running phase**: daily check-ins by 12 players on mobile. The three improvements, each mapped to an approved mockup:

1. **Classificação** — podium for the top 3, ▲▼ position deltas since yesterday, the current player's row pinned/highlighted.
2. **Equipa** — a score hero (total points + rank + points gained today) above the team cards; mascot avatars; eliminated teams visually faded; cinderela bonus highlighted in gold.
3. **Jogos** — relevance-first ordering: "your next match" hero with countdown and what a win is worth, then "your teams playing today", then a condensed list of other games.

Plus one global pattern: **mascot avatars** rendered as circular crops with a gold ring, which turns the mascots' black backgrounds into an intentional vignette (no image re-processing needed).

## About the Design Files

The files in this bundle are **design references created in HTML** — they show intended look and behavior, they are NOT production code to copy. The task is to **recreate these designs inside the existing codebase** (`lockemind/puras_cinderelas`: Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui + Supabase), following its established patterns (server components + server actions, the existing `globals.css` theme tokens, the existing `components/` structure).

- `Hi-fi Puras Cinderelas.dc.html` — the approved high-fidelity mockup (3 phone screens side by side). **This is the source of truth.**
- `Wireframes Puras Cinderelas.dc.html` — earlier exploration (9 wireframes); kept for context only. The approved frames were 1A, 2A, 3B.
- Open the HTML files in a browser from this folder (keep `support.js` and `public/` alongside them).

## Fidelity

**High-fidelity.** Colors, typography, spacing and copy in the hi-fi mockup are intended as final, and use the codebase's *existing* design tokens (see Design Tokens below — they map 1:1 to `app/globals.css`). Recreate pixel-perfectly using Tailwind utilities / existing token classes (`text-gold`, `bg-night-card`, `border-night-border`, etc.).

---

## Global pattern: MascotAvatar

A new shared component, suggested location `components/mascot-avatar.tsx`:

- Circular crop: `border-radius: 50%`, `object-fit: cover`, `background: #000`.
- Ring: 2px solid. Gold `oklch(0.82 0.15 85)` for emphasized contexts (leader, own teams, expanded card), gold-dark `oklch(0.65 0.14 85)` for default, `oklch(0.40 0.01 265)` + `filter: grayscale(1)` for eliminated teams, `oklch(0.35 0.015 265)` for opponent/neutral.
- Sizes used in the mockup: 72px (match hero), 58px (podium 1st), 46/42px (podium 2nd/3rd, team cards), 34px (match rows).
- Source images: existing `public/mascots/<slug>.webp` (full-size, black background — the crop handles it). The existing `public/mascots/icons/` are not needed for these screens.

---

## Screen 1 — Classificação (`app/play/[token]/ranking/page.tsx`)

### Purpose
The daily check-in screen. Answers "did I move up or down?" in one glance.

### Layout (top to bottom inside the existing player layout)
1. **Title row** — `Classificação` (15px/600, foreground) left; sync indicator right (existing `components/sync-indicator.tsx`, e.g. `↻ há 12 min`, 12px muted).
2. **Podium** — CSS grid `grid-template-columns: 1fr 1.15fr 1fr`, gap 8px, `align-items: end`, for ranks 2 / 1 / 3 (1st in the taller center cell):
   - 2nd & 3rd cards: bg `night-card`, 1px `night-border` border, radius 12px, padding ~12px 8px 10px. Contents (column, centered, gap 5px): MascotAvatar of the player's **Pot 1 team** (46px / 42px, gold-dark ring), player name (13px/600), points (16px/700 gold), rank label `2º`/`3º` (11px muted).
   - 1st card: bg `linear-gradient(180deg, gold/0.16, night-card)`, border 1px `gold/0.45`, radius 14px, padding 16px 8px 12px. Crown emoji 👑 absolutely positioned, centered, top −11px. Avatar 58px with 2.5px gold ring, name 14px/700, points 20px/800 gold, `1º` 11px gold/600.
3. **Rows for ranks 4–12** — vertical stack, gap 6px. Each row: flex, gap 10px, bg `night-card`, 1px `night-border`, radius 10px, padding 10px 14px:
   - rank number (13px muted, 18px wide, centered, tabular-nums)
   - player name (14px/500 foreground, flex 1)
   - **delta**: `▲n` green `oklch(0.7 0.14 150)` / `▼n` red `oklch(0.62 0.22 25)` / `—` faint `oklch(0.40 0.01 265)`, 11px/600
   - points (14px/700 gold, tabular-nums)
4. **Current player's row**: bg `gold/0.12`, border 1.5px `gold/0.55`, name 700 weight + a `TU` badge (9px/800, letter-spacing 1px, padding 2px 6px, radius 6px, gold background, night text), points 800 weight. Keep the existing behavior where the player's row is expandable to show their teams (current `ranking-table.tsx` `<details>` pattern) — expansion was not redesigned, keep as is.

### Kept from current implementation
- The expand-to-see-teams behavior and lock-state rules (`isLocked` gating which players can be expanded) from `components/ranking-table.tsx`.
- The players/teams `StandingsToggle` — this redesign covers the players view; the teams view is unchanged.

### Data requirements (the only backend addition in this handoff)
**Daily rank snapshot** for the ▲▼ deltas:
- New table, e.g. `ranking_snapshots (id, player_id, snapshot_date date, rank int, points int)`, unique on `(player_id, snapshot_date)`.
- Written once per day by a `pg_cron` job (the project already uses pg_cron for `sync-results` / `sync-fixtures`), e.g. at 06:00 UTC: compute current ranking (same logic as `getRankings()` in `actions/results.ts`) and upsert.
- Delta = yesterday's snapshot rank − current live rank (positive → ▲). No snapshot row → show `—`.

---

## Screen 2 — Equipa (`app/play/[token]/team/page.tsx`, `components/team-card.tsx`)

### Purpose
"How are my 4 teams doing?" — now led by the number the player actually cares about.

### Layout
1. **Score hero** (new, centered column, padding ~18px 0 6px, gap 6px):
   - Label `OS MEUS PONTOS` — 11px/600, letter-spacing 3px, uppercase, muted.
   - Total — 64px/800 gold, line-height 1, tabular-nums, subtle glow `text-shadow: 0 0 40px gold/0.35`.
   - Chips row (flex, gap 8px): rank chip `6º lugar` (12px/600 gold, bg gold/0.12, 1px border gold/0.35, fully rounded, padding 3px 12px) + today's delta `▲ +6 hoje` (12px/600, green `oklch(0.7 0.14 150)`). "Today" = points now − points at last daily snapshot (same snapshot table as Screen 1).
2. **Team cards** (stack, gap 8px, sorted by pot — extends existing `TeamCard`):
   - **Collapsed card**: flex row, gap 12px, bg `night-card`, 1px `night-border`, radius 12px, padding 11px 14px. Contents: MascotAvatar 42px (replaces the flag emoji; gold-dark ring) · column with team name (15px/600) and `Pote N · <stage label>` (12px muted, existing `STAGE_LABELS`) · points (17px/700 gold, tabular-nums) · chevron `▾` (11px faint).
   - **Expanded card** (keep `<details>` mechanic): border becomes 1.5px `gold/0.5`; summary row gets bg `gold/0.08` and gold-ringed avatar; name gets `✨` suffix when the team has cinderela bonuses. Breakdown section (padding 10px 16px 12px, gap 6px, top border `night-border`), rows 13px with muted label / foreground value:
     - `Fase de grupos (2V 1E)` → `+7`
     - one row per knockout round won (`1/16 de Final` → `+5`, `1/8 de Final` → `+8`, …) — from `getScoreBreakdown()` in `lib/scoring.ts`
     - **Cinderela bonus row** (when > 0): label `✨ Bónus Cinderela ×n`, both sides gold/600–700, row bg gold/0.12, radius 8px, padding 5px 8px, bleeding 8px into the horizontal padding (negative margin).
     - `Total` row: top border, label muted/600, value gold/700, e.g. `28 pts`.
   - **Eliminated team card**: whole card `opacity: 0.45`, avatar grayscale with faint ring, team name `line-through`, subtitle `Pote 4 · Eliminado nos grupos`, points in muted (not gold). Card stays in the list (the history matters). "Eliminated" = knocked out per fixtures/progress data; note the current `StageReached` model does not distinguish "still in group stage" from "eliminated in groups" — derive from finished group fixtures or add a flag.

---

## Screen 3 — Jogos (`app/play/[token]/selections/page.tsx` + new components)

### Purpose
Replace the undifferentiated full schedule with relevance-first ordering: what matters to *me*, *today*.

### Layout
1. **"O teu próximo jogo" hero** (new client component, e.g. `components/next-match-hero.tsx`): card bg `linear-gradient(180deg, oklch(0.16 0.02 265), oklch(0.12 0.015 265))`, border 1.5px `gold/0.4`, radius 16px, padding 16px 14px 12px, column gap 12px:
   - Label `O TEU PRÓXIMO JOGO` — 10px/700, letter-spacing 2.5px, uppercase, gold, centered.
   - Face-off row (`justify-content: space-around`): my team = MascotAvatar 72px, 2.5px gold ring, glow `box-shadow: 0 0 24px gold/0.25`, name 13px/700 foreground below; opponent = 72px avatar with neutral ring `oklch(0.35 0.015 265)`, name 13px/500 muted. Center column: `começa em` (11px muted), **countdown** `2h 14m` (26px/800 gold, tabular-nums, client-side ticking from `fixture.utc_date`), `Quartos · 20:00` (11px muted).
   - Footer (top border `night-border`, padding-top 9px, centered): `✨ vitória vale +12 pts e +10 de bónus cinderela` — 12px/600 gold. Computed from `lib/scoring.ts` constants: knockout win points for the fixture's stage + the cinderela milestone bonus for the team's pot (pots 3–4 only).
   - Hero picks the **soonest upcoming fixture involving one of my teams**; if one of my teams is currently LIVE, that match takes the hero slot instead (with live minute instead of countdown).
2. **`EM CAMPO HOJE · n EQUIPAS TUAS`** section (label style: 11px/600, letter-spacing 2px, uppercase, muted). One row per fixture today involving my teams (flex, gap 10px, radius 12px, padding 10px 14px, 34px MascotAvatar of my team):
   - **Live row**: bg `destructive/0.08`, border 1.5px `destructive/0.45`, text `**Marrocos** 1–1 Japão`, right side red live indicator: 6px pulsing dot + minute `67'` (11px/800 destructive).
   - **Upcoming row**: bg `gold/0.08`, border 1.5px `gold/0.4`, text `**Noruega** vs Colômbia`, right side kickoff time (13px/600 muted, tabular-nums).
3. **`OUTROS JOGOS`** section: condensed rows (flex, gap 10px, padding 9px 4px, bottom border `oklch(0.16 0.015 265)`, no card background): flag emoji 15px · fixture text 13px in `oklch(0.75 0.008 265)` (e.g. `Brasil 2–0 Egito`) · right status `FT` (11px/600 faint) or time (12px tabular-nums faint). Show today's remaining/other games; below, a centered link `ver calendário completo ▾` (13px/500, gold-dark `oklch(0.65 0.14 85)`) revealing/leading to the full grouped-by-date list (the current page's behavior, kept as the fallback view).
4. Row tap targets keep the existing navigation to `/play/[token]/selections/[fixtureId]`.

---

## Interactions & Behavior

- **Countdown** ticks every minute (client component; server renders initial value from `utc_date`).
- **Live indicator**: red dot pulses (CSS `@keyframes` opacity 1 → 0.4, ~1.2s ease-in-out infinite alternate).
- **Expand/collapse** (team cards, own ranking row): keep the existing native `<details>/<summary>` approach; chevron rotates 180° on open, `transition: transform 200ms`.
- **Active tab** in bottom nav: gold text + 2px gold top border (existing `components/player-nav.tsx` behavior — unchanged).
- Press feedback on tappable rows: `active:opacity-70` (existing pattern).
- All hit targets ≥ 44px tall (rows are 44–56px as specified).
- No hover states required (mobile-only product).

## State Management

- Pages remain **server components**; the only new client components are the countdown hero and (already client) nav.
- New data needs:
  - `ranking_snapshots` table + daily pg_cron job (see Screen 1) → powers rank deltas and "+n hoje".
  - `getRankings()` extended to join yesterday's snapshot.
  - A `getNextMyFixture(playerId)` / extension of `getFixtures()` separating: my live fixtures, my fixtures today, next upcoming mine, other fixtures today.
  - "What a win is worth" helper in `lib/scoring.ts` (stage → points, pot → next cumulative bonus).

## Design Tokens

All from the existing `app/globals.css` — **no new tokens needed**:

| Token | Value | Used for |
|---|---|---|
| `--color-night` / `--background` | `oklch(0.10 0.015 265)` | screen background |
| `--color-night-card` / `--card` | `oklch(0.13 0.015 265)` | cards, nav |
| `--color-night-border` / `--border` | `oklch(0.18 0.015 265)` | card borders, dividers |
| `--foreground` | `oklch(0.95 0.005 265)` | primary text |
| `--muted-foreground` | `oklch(0.55 0.01 265)` | secondary text, labels |
| `--color-gold` / `--primary` | `oklch(0.82 0.15 85)` | points, accents, active states |
| `--color-gold-dark` | `oklch(0.65 0.14 85)` | default avatar rings, tertiary links |
| `--color-gold-muted` | `oklch(0.82 0.15 85 / 0.12)` | highlighted row/chip backgrounds |
| `--destructive` | `oklch(0.62 0.22 25)` | live matches, ▼ deltas |
| green (new usage, inline ok) | `oklch(0.7 0.14 150)` | ▲ deltas, "+n hoje" |
| faint text | `oklch(0.40–0.45 0.01 265)` | chevrons, `—` deltas, FT labels |
| `--radius` | `0.5rem` base | rows 10px, cards 12px, heroes 14–16px, chips/badges 999px |

**Typography**: Geist (already loaded via `next/font`). Scale used: 10–11px uppercase tracked labels (letter-spacing 2–3px) · 12–13px secondary · 14–15px body/names · 17px card points · 20–26px hero numbers · 64px score hero. Weights 500/600/700/800. Numbers always `tabular-nums`.

**Spacing**: 16px horizontal page padding · 14–16px gaps between sections · 6–8px gaps between rows/cards · 10–14px card padding.

## Assets

- `public/mascots/*.webp` — existing AI-generated mascots (black backgrounds; handled by the circular-crop avatar, **no re-processing required**).
- `public/logo.jpg` — existing logo, 38px circular in the header (unchanged).
- Flag emojis — kept for the condensed "outros jogos" rows and anywhere mascots would be too heavy.
- Sample copies of the referenced assets are included under `public/` in this bundle so the HTML mockups render.

## Files

| File | What it is |
|---|---|
| `Hi-fi Puras Cinderelas.dc.html` | **Approved hi-fi mockup** — 3 phone screens (Classificação, Equipa, Jogos). Source of truth for all measurements above. |
| `Wireframes Puras Cinderelas.dc.html` | Exploration wireframes (3 directions × 3 screens + mascot-treatment study). Context only. |
| `support.js` | Runtime needed by the HTML files — keep next to them, do not implement. |
| `public/` | Mascot/logo samples so the mockups render locally. |

### Suggested implementation order
1. `MascotAvatar` component (pure UI, no data changes) — drop into ranking, team cards, fixtures.
2. Equipa score hero + card restyle (needs only existing data, minus "+n hoje").
3. Jogos reordering + hero (existing fixtures data; countdown client component; "worth" helper).
4. `ranking_snapshots` migration + cron job → deltas on Classificação and "+n hoje" on Equipa.
5. Classificação podium + row restyle.
