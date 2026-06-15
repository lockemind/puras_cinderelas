# Snappier Navigation — Performance Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the player-facing app feel instant by removing the 1.5s mascot loading wall, adding skeleton loading states for tab navigation, removing unnecessary `force-dynamic`, and deduplicating redundant database calls.

**Architecture:** The player app lives under `app/play/[token]/` with three tabs (team, ranking, selections) plus a fixture detail sub-route. The layout wraps all pages and renders a header + bottom nav. Currently a `MascotReveal` client component intercepts every pathname change and hides content for 1500ms. We'll remove that, add `loading.tsx` skeletons for each tab, remove `force-dynamic` from the layout, and wrap `getPlayerByToken` in `React.cache` so layout + page share a single DB hit per render.

**Tech Stack:** Next.js 16, React 19, Supabase, Tailwind CSS v4

**Key insight from Next.js 16 docs:** Layouts are cached client-side during navigation — they don't re-render on tab switches. This means `loading.tsx` files will show **instantly** when switching tabs, because only the page segment changes. The layout only runs on initial page load.

---

### Task 1: Remove MascotReveal

**Files:**
- Modify: `app/play/[token]/layout.tsx`
- Delete: `components/mascot-reveal.tsx`

This is the highest-impact change. `MascotReveal` wraps `{children}` and hides all content for 1500ms on every navigation. Removing it makes content visible immediately.

- [ ] **Step 1.1: Remove MascotReveal from the layout**

In `app/play/[token]/layout.tsx`, remove the import and unwrap children:

```tsx
// REMOVE this line:
import { MascotReveal } from '@/components/mascot-reveal'

// CHANGE this:
<main className="flex-1 overflow-y-auto px-4 pb-24">
  <MascotReveal>{children}</MascotReveal>
</main>

// TO this:
<main className="flex-1 overflow-y-auto px-4 pb-24">
  {children}
</main>
```

- [ ] **Step 1.2: Delete the MascotReveal component**

```bash
rm components/mascot-reveal.tsx
```

- [ ] **Step 1.3: Verify no other imports reference MascotReveal**

```bash
grep -rn "mascot-reveal\|MascotReveal" --include="*.tsx" --include="*.ts" . | grep -v node_modules
```

Expected: no results (the file is only imported in the layout we just changed).

- [ ] **Step 1.4: Commit**

```bash
git add app/play/\[token\]/layout.tsx
git rm components/mascot-reveal.tsx
git commit -m "perf: remove MascotReveal 1.5s loading wall on navigation"
```

---

### Task 2: Remove `force-dynamic` from the player layout

**Files:**
- Modify: `app/play/[token]/layout.tsx:1`

The layout currently exports `export const dynamic = 'force-dynamic'` which forces every request to skip all caching. The route is already naturally dynamic because it uses `await params` — the `force-dynamic` is redundant and prevents Next.js from making any caching optimisations.

- [ ] **Step 2.1: Remove the force-dynamic export**

In `app/play/[token]/layout.tsx`, delete line 1:

```tsx
// DELETE this line:
export const dynamic = 'force-dynamic'
```

- [ ] **Step 2.2: Verify the app still builds and runs**

```bash
npx next build 2>&1 | tail -20
```

The route is still dynamic (uses `await params` and uncached Supabase queries), so behaviour is unchanged — we're just not forcing it redundantly.

- [ ] **Step 2.3: Commit**

```bash
git add app/play/\[token\]/layout.tsx
git commit -m "perf: remove redundant force-dynamic from player layout"
```

---

### Task 3: Deduplicate `getPlayerByToken` with `React.cache`

**Files:**
- Modify: `actions/players.ts`

The layout calls `getPlayerByToken(token)` to render the header, and then every page calls it again to verify the player exists. Since these use Supabase client (not `fetch`), they aren't auto-deduped. Wrapping in `React.cache` deduplicates within a single server render pass.

- [ ] **Step 3.1: Wrap getPlayerByToken in React.cache**

In `actions/players.ts`, add the `cache` import and wrap the function:

```tsx
import { cache } from 'react'

// Keep the raw implementation as a private function
async function _getPlayerByToken(token: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('access_token', token)
    .single()

  if (error) return null
  return data
}

// Export the cached version — dedupes within a single server render pass
export const getPlayerByToken = cache(_getPlayerByToken)
```

Note: `'use server'` at the top of the file makes all exports server actions. `React.cache` returns a new function, and that's fine — it's still callable from server components. The existing `createPlayer` and `getAllPlayers` functions are unchanged.

- [ ] **Step 3.2: Verify no type errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors. The return type is identical.

- [ ] **Step 3.3: Commit**

```bash
git add actions/players.ts
git commit -m "perf: deduplicate getPlayerByToken with React.cache"
```

---

### Task 4: Add loading skeleton for the Team tab

**Files:**
- Create: `app/play/[token]/team/loading.tsx`

The team page fetches competition state, player teams, rankings, and fixtures — the heaviest data load. The skeleton should mirror the page's structure: a score hero placeholder + team card placeholders.

- [ ] **Step 4.1: Create the team loading skeleton**

Create `app/play/[token]/team/loading.tsx`:

```tsx
export default function TeamLoading() {
  return (
    <div className="py-2 space-y-4 animate-pulse">
      {/* ScoreHero skeleton */}
      <div className="rounded-xl bg-night-card border border-night-border p-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-20 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
      </div>

      {/* TeamCard skeletons (4 pots) */}
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="rounded-xl bg-night-card border border-night-border p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-3 w-40 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4.2: Commit**

```bash
git add app/play/\[token\]/team/loading.tsx
git commit -m "perf: add skeleton loading state for team tab"
```

---

### Task 5: Add loading skeleton for the Ranking tab

**Files:**
- Create: `app/play/[token]/ranking/loading.tsx`

The ranking page shows a standings table. The skeleton mimics the header + rows pattern.

- [ ] **Step 5.1: Create the ranking loading skeleton**

Create `app/play/[token]/ranking/loading.tsx`:

```tsx
export default function RankingLoading() {
  return (
    <div className="py-4 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-28 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>

      {/* Table rows */}
      <div className="space-y-1">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg bg-night-card border border-night-border px-3 py-3"
          >
            <div className="w-5 h-5 rounded bg-muted" />
            <div className="h-4 flex-1 rounded bg-muted" />
            <div className="h-4 w-10 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5.2: Commit**

```bash
git add app/play/\[token\]/ranking/loading.tsx
git commit -m "perf: add skeleton loading state for ranking tab"
```

---

### Task 6: Add loading skeleton for the Selections (Jogos) tab

**Files:**
- Create: `app/play/[token]/selections/loading.tsx`

The selections page shows a hero match card + fixture list. The skeleton mirrors that.

- [ ] **Step 6.1: Create the selections loading skeleton**

Create `app/play/[token]/selections/loading.tsx`:

```tsx
export default function SelectionsLoading() {
  return (
    <div className="py-4 space-y-5 animate-pulse">
      {/* NextMatchHero skeleton */}
      <div className="rounded-2xl bg-night-card border border-gold/20 p-5 space-y-4">
        <div className="flex items-center justify-around">
          <div className="w-16 h-16 rounded-full bg-muted" />
          <div className="h-4 w-8 rounded bg-muted" />
          <div className="w-16 h-16 rounded-full bg-muted" />
        </div>
        <div className="h-3 w-32 rounded bg-muted mx-auto" />
      </div>

      {/* Section label */}
      <div className="h-3 w-36 rounded bg-muted" />

      {/* Fixture rows */}
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 rounded-xl border border-night-border px-3.5 py-2.5"
        >
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="h-4 flex-1 rounded bg-muted" />
          <div className="h-3 w-12 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6.2: Commit**

```bash
git add app/play/\[token\]/selections/loading.tsx
git commit -m "perf: add skeleton loading state for selections tab"
```

---

### Task 7: Add loading skeleton for the Fixture Detail page

**Files:**
- Create: `app/play/[token]/selections/[fixtureId]/loading.tsx`

The fixture detail page is navigated to from the selections list. It shows a back link, match header, mascot hero, and owners list. The skeleton mirrors that structure.

- [ ] **Step 7.1: Create the fixture detail loading skeleton**

Create `app/play/[token]/selections/[fixtureId]/loading.tsx`:

```tsx
export default function FixtureLoading() {
  return (
    <div className="py-4 space-y-4 animate-pulse">
      {/* Back link */}
      <div className="h-4 w-16 rounded bg-muted" />

      {/* MatchHeader skeleton */}
      <div className="rounded-xl bg-night-card border border-night-border p-4 space-y-3">
        <div className="flex items-center justify-around">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded bg-muted mx-auto" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
          <div className="h-6 w-14 rounded bg-muted" />
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded bg-muted mx-auto" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        </div>
      </div>

      {/* MascotHero skeleton */}
      <div className="rounded-xl bg-night-card border border-gold/20 p-4 flex justify-around items-end">
        <div className="w-[140px] h-[140px] rounded bg-muted" />
        <div className="h-4 w-6 rounded bg-muted" />
        <div className="w-[140px] h-[140px] rounded bg-muted" />
      </div>
    </div>
  )
}
```

- [ ] **Step 7.2: Commit**

```bash
git add app/play/\[token\]/selections/\[fixtureId\]/loading.tsx
git commit -m "perf: add skeleton loading state for fixture detail page"
```

---

### Task 8: Verify in browser

- [ ] **Step 8.1: Start the dev server and test tab navigation**

```bash
npm run dev
```

Open the app in a browser at a player URL (e.g. `/play/<token>/team`). Switch between the three tabs (Equipa, Classificação, Jogos). Verify:

1. No mascot animation appears — content loads directly
2. Skeleton loading states flash briefly (or not at all if data is fast) during tab switches
3. Clicking into a fixture detail from Jogos shows the fixture skeleton
4. The header and bottom nav remain visible and interactive during all navigations

- [ ] **Step 8.2: Test initial page load**

Open a player URL directly in a new tab. Verify the page loads without the old 1.5s mascot delay. The layout header (logo + player name) should appear, then page content fills in.

- [ ] **Step 8.3: Final commit if any adjustments were needed**

If skeleton tweaks were needed during testing, commit them:

```bash
git add -A
git commit -m "perf: polish skeleton loading states after browser testing"
```
