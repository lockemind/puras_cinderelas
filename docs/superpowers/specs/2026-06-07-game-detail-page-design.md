# Game Detail Page — Design Spec

## Overview

Tapping a fixture row in the Jogos calendar opens a dedicated detail page for that game. The page shows the match header, mascots for both teams (all 48 teams now have mascots), and — only after choices are locked — which players own the competing teams and how many points those teams are currently earning them.

---

## Route

```
/play/[token]/selections/[fixtureId]
```

The `[fixtureId]` segment is the internal UUID of the fixture row. The existing `/play/[token]/selections` page becomes the parent; the new page is a child route.

---

## Page Sections (top to bottom)

### 1. Back navigation
A `← Jogos` link that returns to `/play/[token]/selections`.

### 2. Match header
Displayed in a card. Contains:
- Home team: flag emoji + name
- Score (if `FINISHED`) or kick-off time + status label (if not)
- Away team: flag emoji + name
- Sub-line: stage name · formatted date · kick-off time (local)

### 3. Mascot hero *(conditional)*

| Teams with a mascot | Rendering |
|---|---|
| 0 | Section hidden entirely |
| 1 | Single mascot centred, labelled with team name |
| 2 | Both mascots side by side facing each other, each labelled, separated by a small "vs" |

Mascot availability is determined by the `mascot` column on the `teams` table (nullable). In practice all 48 teams have mascots, but the logic stays defensive — the section is shown only when at least one team has a non-null value.

### 4. Player ownership *(gated by competition status)*

Hidden entirely when `competition.status` is `setup` or `draft` (consistent with the ranking page behaviour).

Shown when status is `locked`, `running`, or `finished`.

When shown:
- Section title: **"Quem tem estas equipas"**
- One row per player, sorted: players who own one of the two teams first (sorted by name), then the rest greyed out
- Each row with a team: player name (bold+white if viewing player) · team flag + name · current points from that team
- Each row without a team: player name (muted) · "— sem equipa"

---

## Data

### New server action: `getFixtureDetail`

Located in `actions/fixtures.ts`. Takes `fixtureId: string`. Returns:
- The full fixture (teams including their `mascot` slug, score, status, stage, group, utc_date)
- Not-found → `null` (page calls `notFound()`)

Update the `getFixtures` select query to also include `mascot` from both team joins.

### New server action: `getFixtureOwnership`

Located in `actions/fixtures.ts`. Takes two team IDs. Returns all players annotated with:
- Which of the two teams they own (if any) and the pot assignment
- Current `breakdown.total` points for that team (reuse `getScoreBreakdown` from `lib/scoring`)

Derived from the existing `getRankings` data shape — no new DB query needed.

### DB migration (`004_mascots.sql`)

Add `mascot text` column to `teams` (nullable). Populate for all 48 teams.

```sql
alter table teams add column mascot text;

-- Pot 1
update teams set mascot = 'alemanha'       where name = 'Alemanha';
update teams set mascot = 'argentina'      where name = 'Argentina';
update teams set mascot = 'belgica'        where name = 'Bélgica';
update teams set mascot = 'brasil'         where name = 'Brasil';
update teams set mascot = 'canada'         where name = 'Canadá';
update teams set mascot = 'espanha'        where name = 'Espanha';
update teams set mascot = 'franca'         where name = 'França';
update teams set mascot = 'inglaterra'     where name = 'Inglaterra';
update teams set mascot = 'mexico'         where name = 'México';
update teams set mascot = 'paises-baixos'  where name = 'Países Baixos';
update teams set mascot = 'portugal'       where name = 'Portugal';
update teams set mascot = 'usa'            where name = 'Estados Unidos';

-- Pot 2
update teams set mascot = 'croacia'        where name = 'Croácia';
update teams set mascot = 'marrocos'       where name = 'Marrocos';
update teams set mascot = 'colombia'       where name = 'Colômbia';
update teams set mascot = 'uruguai'        where name = 'Uruguai';
update teams set mascot = 'suica'          where name = 'Suíça';
update teams set mascot = 'japao'          where name = 'Japão';
update teams set mascot = 'senegal'        where name = 'Senegal';
update teams set mascot = 'irao'           where name = 'Irão';
update teams set mascot = 'coreia_do_sul'  where name = 'Coreia do Sul';
update teams set mascot = 'equador'        where name = 'Equador';
update teams set mascot = 'austria'        where name = 'Áustria';
update teams set mascot = 'australia'      where name = 'Austrália';

-- Pot 3
update teams set mascot = 'noruega'        where name = 'Noruega';
update teams set mascot = 'panama'         where name = 'Panamá';
update teams set mascot = 'egipto'         where name = 'Egito';
update teams set mascot = 'algeria'        where name = 'Argélia';
update teams set mascot = 'escocia'        where name = 'Escócia';
update teams set mascot = 'paraguai'       where name = 'Paraguai';
update teams set mascot = 'tunisia'        where name = 'Tunísia';
update teams set mascot = 'costa_do_marfim' where name = 'Costa do Marfim';
update teams set mascot = 'uzbequistao'    where name = 'Uzbequistão';
update teams set mascot = 'qatar'          where name = 'Qatar';
update teams set mascot = 'arabia_saudita' where name = 'Arábia Saudita';
update teams set mascot = 'africa_do_sul'  where name = 'África do Sul';

-- Pot 4
update teams set mascot = 'jordania'       where name = 'Jordânia';
update teams set mascot = 'cabo_verde'     where name = 'Cabo Verde';
update teams set mascot = 'gana'           where name = 'Gana';
update teams set mascot = 'curacao'        where name = 'Curaçau';
update teams set mascot = 'haiti'          where name = 'Haiti';
update teams set mascot = 'nova_zelandia'  where name = 'Nova Zelândia';
update teams set mascot = 'bosnia'         where name = 'Bósnia e Herzegovina';
update teams set mascot = 'suecia'         where name = 'Suécia';
update teams set mascot = 'turquia'        where name = 'Turquia';
update teams set mascot = 'chequia'        where name = 'Chéquia';
update teams set mascot = 'congo'          where name = 'República Democrática do Congo';
update teams set mascot = 'iraq'           where name = 'Iraque';
```

---

## Components

| Component | File | Responsibility |
|---|---|---|
| `MatchHeader` | `components/match-header.tsx` | Teams, score/time, stage, date |
| `MascotHero` | `components/mascot-hero.tsx` | 0/1/2 mascot states |
| `OwnersList` | `components/owners-list.tsx` | Player ownership table, gated |

All three are server components.

---

## Calendar list: make rows tappable

Wrap each fixture `<div>` in `selections/page.tsx` with a `<Link href={`/play/${token}/selections/${fixture.id}`}>`. Add `cursor-pointer` and a subtle hover/active state consistent with the app theme.

---

## Mascot image paths

```
/mascots/[slug].webp  ← 480px source, used in hero
```

Use `width={200} height={200}` for the single-mascot case and `width={160} height={160}` for the side-by-side case. The icons folder (`/mascots/icons/`) is not used on this page.

---

## `Fixture` type update

Add `mascot: string | null` to the nested `home_team` and `away_team` shapes in `lib/types.ts`.

---

## Edge cases

- **Fixture not found**: `notFound()` → existing not-found page.
- **Teams not yet synced** (home_team or away_team is null): render "?" with a dash, same as the calendar.
- **No players own either team**: ownership section shows all players as "sem equipa".
- **Both mascot columns null**: mascot section hidden, no placeholder.
