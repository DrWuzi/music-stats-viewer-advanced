# Shared Empty-State Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ~101 ad hoc empty/no-data-state JSX blocks across dashboard widgets and pages with one shared `<EmptyState>` component, for visual and textual consistency.

**Architecture:** A single new component at `components/ui/empty-state.tsx` (icon + title + optional description + optional action, with a `compact`/`default` size prop), then a mechanical sweep replacing every ad hoc empty-state block with a call to it.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, lucide-react (`^1.20.0`), `class-variance-authority` (via existing `buttonVariants`).

## Global Constraints

- Component location: `components/ui/empty-state.tsx` (follows the existing `components/ui/*.tsx` shadcn-style convention).
- API: `icon` (required `LucideIcon`), `title` (required `string`), `description` (optional `string`), `size` (`"default" | "compact"`, defaults to `"default"`), `action` (optional `{ label: string; href: string }`), `className` (optional passthrough).
- `size="compact"` is used for every dashboard widget instance (Tasks 2–5); `size` is omitted (defaults to `"default"`) for every page-level instance (Tasks 6–7).
- **No `action` prop is wired in this migration.** Rationale: several ad hoc empty states already have a separate, existing link/CTA nearby (e.g. "Try another comparison", a year picker, "Back to home") — those stay exactly where they are, unchanged, sitting next to the new `<EmptyState>`. Inventing brand-new CTAs (e.g. a "Sync now" link) on ~15 widgets that don't currently have one is out of scope for this pass — it's a behavior change beyond "make existing empty states consistent," and every one of those widgets already sits on a page that has its own sync control. This keeps the migration a pure, low-risk refactor. The `action` prop still exists on the component for future use.
- Text unification: where multiple widgets show the exact same underlying condition with slightly different ad hoc phrasing ("No data" / "No data available" / "No data available."), the migrated text becomes **"No data available."** (with period). This applies to: `artist-connections.tsx`, `genre-breakdown-detail.tsx`, `listening-forecast.tsx` (first instance), `scrobble-integrity.tsx`, `sonic-dna.tsx`. Every other instance keeps its exact existing wording verbatim.
- Line numbers cited below are approximate (from a research pass) — locate the exact block in each file by matching the quoted current text, not solely by line number.
- No automated tests are required for this plan — the user will manually verify empty states after each task. Verification per task is `npx tsc --noEmit` (catches typos in props/imports) run from the repo root.
- All lucide-react icon names used below have been verified to exist in the installed version (`lucide-react@^1.20.0`) — no import will 404.

---

### Task 1: Create the `EmptyState` component

**Files:**
- Create: `components/ui/empty-state.tsx`

**Interfaces:**
- Produces: `EmptyState` component, `EmptyStateProps` type (not exported — internal to the file), with signature:
  ```ts
  interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description?: string
    size?: "default" | "compact"
    action?: { label: string; href: string }
    className?: string
  }
  function EmptyState(props: EmptyStateProps): JSX.Element
  ```
  All later tasks import it as `import { EmptyState } from '@/components/ui/empty-state'` and pass `icon`, `title`, optionally `description`, optionally `size="compact"`.

- [ ] **Step 1: Create the component file**

Create `components/ui/empty-state.tsx` with this exact content:

```tsx
import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  size?: "default" | "compact"
  action?: { label: string; href: string }
  className?: string
}

function EmptyState({
  icon: Icon,
  title,
  description,
  size = "default",
  action,
  className,
}: EmptyStateProps) {
  const isCompact = size === "compact"

  return (
    <div
      data-slot="empty-state"
      data-size={size}
      className={cn(
        "flex flex-col items-center gap-2 text-center text-muted-foreground",
        isCompact ? "py-6" : "py-12",
        className
      )}
    >
      <Icon className={cn("opacity-40", isCompact ? "h-6 w-6" : "h-10 w-10")} />
      <p className={cn("font-medium", isCompact ? "text-xs" : "text-sm")}>{title}</p>
      {description && (
        <p className={cn("opacity-70", isCompact ? "text-xs" : "text-sm")}>
          {description}
        </p>
      )}
      {action && (
        <Link
          href={action.href}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}

export { EmptyState }
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors referencing `components/ui/empty-state.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/ui/empty-state.tsx
git commit -m "feat: add shared EmptyState component"
```

---

## Widget Migration Tasks (Tasks 2–5)

Every widget instance uses `size="compact"`, no `action`. Each task below lists the exact files/blocks to change, one worked example showing the transformation pattern, then a per-file step. Every step: (a) add `import { EmptyState } from '@/components/ui/empty-state'` if the file doesn't already import it, (b) add the named icon(s) to the file's existing `from 'lucide-react'` import (or add a new import line if the file has none), (c) replace the ad hoc empty-state block with the `<EmptyState>` call shown.

**Worked example** (this exact pattern applies to every row in the tables below):

Before (`components/you-might-like.tsx`, inside the `!loading && !error && recommendations.length === 0` branch):
```tsx
<div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
  <Sparkles className="h-8 w-8 opacity-40" />
  <p className="text-sm">No recommendations found.</p>
  <p className="text-xs opacity-70">
    Listen to more music so we can find artists you haven&apos;t heard yet.
  </p>
</div>
```

After:
```tsx
<EmptyState
  icon={Sparkles}
  title="No recommendations found."
  description="Listen to more music so we can find artists you haven't heard yet."
  size="compact"
/>
```

(`Sparkles` was already imported from `lucide-react` in this file, so no import changes needed beyond adding the `EmptyState` import.)

---

### Task 2: Migrate widget empty states — batch A

**Files to modify** (each row = one edit step; two rows in the same file are done together as one step):

| File | Line(s) | Title | Description | Icon (import status) |
|---|---|---|---|---|
| `components/artist-longevity.tsx` | ~60-66 | `No artists with 2+ years of consistent listening yet.` | — | `CalendarClock` (new) |
| `components/artist-connections.tsx` | ~118-124 | `No data available.` *(unified — was "No data")* | — | `Users` (new) |
| `components/album-of-month.tsx` | ~101-107 | `Not enough data to show monthly albums.` | — | `Disc3` (new) |
| `components/artist-chart.tsx` | ~17-23 | `No data available.` | — | `BarChart2` (new) |
| `components/chart-rise-fall.tsx` | ~74-80 | `Not enough data to compare periods.` | — | `TrendingUp` (already imported) |
| `components/day-of-week-chart.tsx` | ~32-38 | `No scrobble data yet.` | — | `CalendarDays` (new) |
| `components/diversity-score.tsx` | ~37-43 | `Not enough data to calculate diversity.` | — | `PieChart` (new) |
| `components/first-listens.tsx` | ~83-89 | `No data available.` | — | `Sparkles` (new) |
| `components/hourly-heatmap.tsx` | ~61-67 | `No scrobble data yet.` | — | `Clock` (new) |
| `components/genre-breakdown-detail.tsx` | ~86-92 | `No data available.` *(unified — was "No data")* | — | `Tag` (new) |
| `components/hidden-gems.tsx` | ~47-53 | `No hidden gems found yet.` | `Gems appear when you love tracks the world hasn't discovered.` | `Gem` (already imported) |
| `components/listening-forecast.tsx` | ~91-97 AND ~104-110 (same file, one edit step) | `No data available.` *(unified — was "No data")* / `Not enough data for a forecast` | — / — | `TrendingUp` (new, one import covers both blocks) |
| `components/listening-clock.tsx` | ~34-40 | `No scrobble data yet.` | — | `Clock` (new) |
| `components/listening-personality.tsx` | ~186-192 | `Not enough data to determine your listening personality yet.` | — | `Music2` (already imported) |
| `components/listening-chapters.tsx` | ~176-182 | `Not enough history yet.` | — | `BookOpen` (new) |
| `components/listening-gap.tsx` | ~49-55 | `No scrobble data yet.` | — | `Clock` (already imported) |

- [ ] **Step 1:** Edit `components/artist-longevity.tsx` — replace the empty-state block with `<EmptyState icon={CalendarClock} title="No artists with 2+ years of consistent listening yet." size="compact" />`; add `EmptyState` and `CalendarClock` imports.
- [ ] **Step 2:** Edit `components/artist-connections.tsx` — replace with `<EmptyState icon={Users} title="No data available." size="compact" />`; add imports.
- [ ] **Step 3:** Edit `components/album-of-month.tsx` — replace with `<EmptyState icon={Disc3} title="Not enough data to show monthly albums." size="compact" />`; add imports.
- [ ] **Step 4:** Edit `components/artist-chart.tsx` — replace with `<EmptyState icon={BarChart2} title="No data available." size="compact" />`; add imports.
- [ ] **Step 5:** Edit `components/chart-rise-fall.tsx` — replace with `<EmptyState icon={TrendingUp} title="Not enough data to compare periods." size="compact" />`; add `EmptyState` import (`TrendingUp` already imported).
- [ ] **Step 6:** Edit `components/day-of-week-chart.tsx` — replace with `<EmptyState icon={CalendarDays} title="No scrobble data yet." size="compact" />`; add imports.
- [ ] **Step 7:** Edit `components/diversity-score.tsx` — replace with `<EmptyState icon={PieChart} title="Not enough data to calculate diversity." size="compact" />`; add imports.
- [ ] **Step 8:** Edit `components/first-listens.tsx` — replace with `<EmptyState icon={Sparkles} title="No data available." size="compact" />`; add imports.
- [ ] **Step 9:** Edit `components/hourly-heatmap.tsx` — replace with `<EmptyState icon={Clock} title="No scrobble data yet." size="compact" />`; add imports.
- [ ] **Step 10:** Edit `components/genre-breakdown-detail.tsx` — replace with `<EmptyState icon={Tag} title="No data available." size="compact" />`; add imports.
- [ ] **Step 11:** Edit `components/hidden-gems.tsx` — replace with `<EmptyState icon={Gem} title="No hidden gems found yet." description="Gems appear when you love tracks the world hasn't discovered." size="compact" />`; add `EmptyState` import (`Gem` already imported).
- [ ] **Step 12:** Edit `components/listening-forecast.tsx` — replace the first block (~91-97) with `<EmptyState icon={TrendingUp} title="No data available." size="compact" />` and the second block (~104-110) with `<EmptyState icon={TrendingUp} title="Not enough data for a forecast" size="compact" />`; add `EmptyState` and `TrendingUp` imports once for the file.
- [ ] **Step 13:** Edit `components/listening-clock.tsx` — replace with `<EmptyState icon={Clock} title="No scrobble data yet." size="compact" />`; add imports.
- [ ] **Step 14:** Edit `components/listening-personality.tsx` — replace with `<EmptyState icon={Music2} title="Not enough data to determine your listening personality yet." size="compact" />`; add `EmptyState` import (`Music2` already imported).
- [ ] **Step 15:** Edit `components/listening-chapters.tsx` — replace with `<EmptyState icon={BookOpen} title="Not enough history yet." size="compact" />`; add imports.
- [ ] **Step 16:** Edit `components/listening-gap.tsx` — replace with `<EmptyState icon={Clock} title="No scrobble data yet." size="compact" />`; add `EmptyState` import (`Clock` already imported).
- [ ] **Step 17: Verify**

Run: `npx tsc --noEmit`
Expected: no errors in the 16 files touched above.

- [ ] **Step 18: Commit**

```bash
git add components/artist-longevity.tsx components/artist-connections.tsx components/album-of-month.tsx components/artist-chart.tsx components/chart-rise-fall.tsx components/day-of-week-chart.tsx components/diversity-score.tsx components/first-listens.tsx components/hourly-heatmap.tsx components/genre-breakdown-detail.tsx components/hidden-gems.tsx components/listening-forecast.tsx components/listening-clock.tsx components/listening-personality.tsx components/listening-chapters.tsx components/listening-gap.tsx
git commit -m "refactor: migrate widget empty states to EmptyState (batch A)"
```

---

### Task 3: Migrate widget empty states — batch B

| File | Line(s) | Title | Description | Icon (import status) |
|---|---|---|---|---|
| `components/listening-sessions.tsx` | ~85-91 | `No scrobble data yet.` | — | `Radio` (new) |
| `components/listening-streaks.tsx` | ~87-91 | `No scrobble data yet.` | — | `Flame` (already imported) |
| `components/listening-time-estimate.tsx` | ~40-46 | `No scrobble data yet.` | — | `Music` (already imported) |
| `components/listening-treemap.tsx` | ~65-71 | `Not enough data yet — keep scrobbling!` | — | `TreePine` (already imported) |
| `components/loved-tracks-timeline.tsx` | ~57-61 | `No loved tracks yet.` | — | `Heart` (new) |
| `components/loved-tracks.tsx` | ~19-24 | `No loved tracks yet.` | `Heart a track on Last.fm and it will show up here.` | `Heart` (already imported) |
| `components/marathon-sessions.tsx` | ~107-111 | `No sessions found.` | — | `Clock` (already imported) |
| `components/monthly-top-track.tsx` | ~88-94 | `No scrobble data yet.` | — | `Calendar` (new) |
| `components/music-evolution.tsx` | ~88-94 | `Not enough history yet.` | — | `TrendingUp` (new) |
| `components/music-age.tsx` | ~164-169 | `Not enough decade tags to calculate music age.` | — | `CalendarClock` (new) |
| `components/music-twins.tsx` | ~76-81 | `Not enough users in the database yet to find twins. Check back later!` | — | `Users` (already imported) |
| `components/new-releases.tsx` | ~37-38 | `No unheard albums found.` | — | `Disc3` (new) |
| `components/night-owl-stats.tsx` | ~58-64 | `No scrobble data yet.` | — | `Moon` (new) |
| `components/on-this-day.tsx` | ~76-80 | `No scrobbles found around this time last year` | — | `Calendar` (already imported) |
| `components/one-hit-wonders.tsx` | ~92-98 | `No one-hit wonders found.` | `Artists you've only heard once or twice will appear here.` | `Sparkles` (already imported) |
| `components/playlist-builder.tsx` | ~163-165 | `No tracks match your search.` | — | `SearchX` (new) |
| `components/peak-year.tsx` | ~51-57 | `No scrobble data yet.` | — | `Calendar` (new) |

- [ ] **Step 1:** Edit `components/listening-sessions.tsx` — replace with `<EmptyState icon={Radio} title="No scrobble data yet." size="compact" />`; add imports.
- [ ] **Step 2:** Edit `components/listening-streaks.tsx` — replace with `<EmptyState icon={Flame} title="No scrobble data yet." size="compact" />`; add `EmptyState` import (`Flame` already imported).
- [ ] **Step 3:** Edit `components/listening-time-estimate.tsx` — replace with `<EmptyState icon={Music} title="No scrobble data yet." size="compact" />`; add `EmptyState` import (`Music` already imported).
- [ ] **Step 4:** Edit `components/listening-treemap.tsx` — replace with `<EmptyState icon={TreePine} title="Not enough data yet — keep scrobbling!" size="compact" />`; add `EmptyState` import (`TreePine` already imported).
- [ ] **Step 5:** Edit `components/loved-tracks-timeline.tsx` — replace with `<EmptyState icon={Heart} title="No loved tracks yet." size="compact" />`; add imports.
- [ ] **Step 6:** Edit `components/loved-tracks.tsx` — replace with `<EmptyState icon={Heart} title="No loved tracks yet." description="Heart a track on Last.fm and it will show up here." size="compact" />`; add `EmptyState` import (`Heart` already imported).
- [ ] **Step 7:** Edit `components/marathon-sessions.tsx` — replace with `<EmptyState icon={Clock} title="No sessions found." size="compact" />`; add `EmptyState` import (`Clock` already imported).
- [ ] **Step 8:** Edit `components/monthly-top-track.tsx` — replace with `<EmptyState icon={Calendar} title="No scrobble data yet." size="compact" />`; add imports.
- [ ] **Step 9:** Edit `components/music-evolution.tsx` — replace with `<EmptyState icon={TrendingUp} title="Not enough history yet." size="compact" />`; add imports.
- [ ] **Step 10:** Edit `components/music-age.tsx` — replace with `<EmptyState icon={CalendarClock} title="Not enough decade tags to calculate music age." size="compact" />`; add imports.
- [ ] **Step 11:** Edit `components/music-twins.tsx` — replace with `<EmptyState icon={Users} title="Not enough users in the database yet to find twins. Check back later!" size="compact" />`; add `EmptyState` import (`Users` already imported).
- [ ] **Step 12:** Edit `components/new-releases.tsx` — replace with `<EmptyState icon={Disc3} title="No unheard albums found." size="compact" />`; add imports.
- [ ] **Step 13:** Edit `components/night-owl-stats.tsx` — replace with `<EmptyState icon={Moon} title="No scrobble data yet." size="compact" />`; add imports.
- [ ] **Step 14:** Edit `components/on-this-day.tsx` — replace with `<EmptyState icon={Calendar} title="No scrobbles found around this time last year" size="compact" />`; add `EmptyState` import (`Calendar` already imported).
- [ ] **Step 15:** Edit `components/one-hit-wonders.tsx` — replace with `<EmptyState icon={Sparkles} title="No one-hit wonders found." description="Artists you've only heard once or twice will appear here." size="compact" />`; add `EmptyState` import (`Sparkles` already imported).
- [ ] **Step 16:** Edit `components/playlist-builder.tsx` — replace with `<EmptyState icon={SearchX} title="No tracks match your search." size="compact" />`; add imports.
- [ ] **Step 17:** Edit `components/peak-year.tsx` — replace with `<EmptyState icon={Calendar} title="No scrobble data yet." size="compact" />`; add imports.
- [ ] **Step 18: Verify**

Run: `npx tsc --noEmit`
Expected: no errors in the 17 files touched above.

- [ ] **Step 19: Commit**

```bash
git add components/listening-sessions.tsx components/listening-streaks.tsx components/listening-time-estimate.tsx components/listening-treemap.tsx components/loved-tracks-timeline.tsx components/loved-tracks.tsx components/marathon-sessions.tsx components/monthly-top-track.tsx components/music-evolution.tsx components/music-age.tsx components/music-twins.tsx components/new-releases.tsx components/night-owl-stats.tsx components/on-this-day.tsx components/one-hit-wonders.tsx components/playlist-builder.tsx components/peak-year.tsx
git commit -m "refactor: migrate widget empty states to EmptyState (batch B)"
```

---

### Task 4: Migrate widget empty states — batch C

| File | Line(s) | Title | Description | Icon (import status) |
|---|---|---|---|---|
| `components/profile-search.tsx` | ~186-192 | `No results for "{query}"` *(preserve existing interpolated `query` expression)* | — | `SearchX` (new) |
| `components/scatter-plot.tsx` | ~48-54 | `No data available yet.` | — | `ScatterChart` (new) |
| `components/scrobble-integrity.tsx` | ~169-176 | `No data available.` *(unified — was "No data")* | — | `CheckCircle` (already imported) |
| `components/scrobble-velocity.tsx` | ~125-132 | `No scrobble data yet.` | — | `Gauge` (new) |
| `components/repeat-plays.tsx` | ~65-69 | `No tracks played {threshold}+ times.` *(preserve existing interpolated expression)* | — | `Repeat` (new) |
| `components/sonic-dna.tsx` | ~177-184 | `No data available.` *(unified — was "No data available" without period)* | — | `Dna` (new) |
| `components/stats-chart.tsx` | ~325-331 AND ~531-535 (same file, one edit step) | `No scrobble data yet.` / `No scrobbles on this day.` | — / — | `BarChart2` (new, one import covers both blocks) |
| `components/top-lists.tsx` | ~40-43 AND ~96-103 (same file, one edit step) | `No data for this period.` (both instances) | — | `ListMusic` (new, one import covers both blocks) |
| `components/streak-calendar.tsx` | ~357-360 | `No tracks played on this day.` | — | `CalendarX` (new) |
| `components/top-collaborations.tsx` | ~90-96 | `Not enough data to show artist pairs.` | — | `Users` (new) |
| `components/underrated-tracks.tsx` | ~117-123 | `No underrated tracks found.` | `Deep cuts appear when your favorite artists have tracks under 100k plays.` | `Mic2` (already imported) |
| `components/weekly-pattern.tsx` | ~79-88 | `No scrobble data yet.` | — | `CalendarDays` (new) |
| `components/you-might-like.tsx` | ~83-91 | `No recommendations found.` | `Listen to more music so we can find artists you haven't heard yet.` | `Sparkles` (already imported) |
| `components/yoy-chart.tsx` | ~79-85 | `No scrobble data yet.` | — | `CalendarRange` (new) |
| `components/artist-loyalty.tsx` | ~32-37 | `No artist data yet.` | — | `Heart` (new) |

- [ ] **Step 1:** Edit `components/profile-search.tsx` — replace with `<EmptyState icon={SearchX} title={\`No results for "${query}"\`} size="compact" />` (use the file's existing query variable name); add imports.
- [ ] **Step 2:** Edit `components/scatter-plot.tsx` — replace with `<EmptyState icon={ScatterChart} title="No data available yet." size="compact" />`; add imports.
- [ ] **Step 3:** Edit `components/scrobble-integrity.tsx` — replace with `<EmptyState icon={CheckCircle} title="No data available." size="compact" />`; add `EmptyState` import (`CheckCircle` already imported).
- [ ] **Step 4:** Edit `components/scrobble-velocity.tsx` — replace with `<EmptyState icon={Gauge} title="No scrobble data yet." size="compact" />`; add imports.
- [ ] **Step 5:** Edit `components/repeat-plays.tsx` — replace with `<EmptyState icon={Repeat} title={\`No tracks played ${threshold}+ times.\`} size="compact" />` (use the file's existing threshold variable name); add imports.
- [ ] **Step 6:** Edit `components/sonic-dna.tsx` — replace with `<EmptyState icon={Dna} title="No data available." size="compact" />`; add imports.
- [ ] **Step 7:** Edit `components/stats-chart.tsx` — replace the first block (~325-331) with `<EmptyState icon={BarChart2} title="No scrobble data yet." size="compact" />` and the second block (~531-535) with `<EmptyState icon={BarChart2} title="No scrobbles on this day." size="compact" />`; add `EmptyState` and `BarChart2` imports once for the file.
- [ ] **Step 8:** Edit `components/top-lists.tsx` — replace both blocks (~40-43 and ~96-103) with `<EmptyState icon={ListMusic} title="No data for this period." size="compact" />`; add `EmptyState` and `ListMusic` imports once for the file.
- [ ] **Step 9:** Edit `components/streak-calendar.tsx` — replace with `<EmptyState icon={CalendarX} title="No tracks played on this day." size="compact" />`; add imports.
- [ ] **Step 10:** Edit `components/top-collaborations.tsx` — replace with `<EmptyState icon={Users} title="Not enough data to show artist pairs." size="compact" />`; add imports.
- [ ] **Step 11:** Edit `components/underrated-tracks.tsx` — replace with `<EmptyState icon={Mic2} title="No underrated tracks found." description="Deep cuts appear when your favorite artists have tracks under 100k plays." size="compact" />`; add `EmptyState` import (`Mic2` already imported).
- [ ] **Step 12:** Edit `components/weekly-pattern.tsx` — replace with `<EmptyState icon={CalendarDays} title="No scrobble data yet." size="compact" />`; add imports.
- [ ] **Step 13:** Edit `components/you-might-like.tsx` — replace with `<EmptyState icon={Sparkles} title="No recommendations found." description="Listen to more music so we can find artists you haven't heard yet." size="compact" />`; add `EmptyState` import (`Sparkles` already imported).
- [ ] **Step 14:** Edit `components/yoy-chart.tsx` — replace with `<EmptyState icon={CalendarRange} title="No scrobble data yet." size="compact" />`; add imports.
- [ ] **Step 15:** Edit `components/artist-loyalty.tsx` — replace with `<EmptyState icon={Heart} title="No artist data yet." size="compact" />`; add imports.
- [ ] **Step 16: Verify**

Run: `npx tsc --noEmit`
Expected: no errors in the 15 files touched above.

- [ ] **Step 17: Commit**

```bash
git add components/profile-search.tsx components/scatter-plot.tsx components/scrobble-integrity.tsx components/scrobble-velocity.tsx components/repeat-plays.tsx components/sonic-dna.tsx components/stats-chart.tsx components/top-lists.tsx components/streak-calendar.tsx components/top-collaborations.tsx components/underrated-tracks.tsx components/weekly-pattern.tsx components/you-might-like.tsx components/yoy-chart.tsx components/artist-loyalty.tsx
git commit -m "refactor: migrate widget empty states to EmptyState (batch C)"
```

---

### Task 5: Migrate widget empty states — batch D

| File | Line(s) | Title | Description | Icon (import status) |
|---|---|---|---|---|
| `components/artist-network.tsx` | ~116-122 | `No artist data available.` | — | `Users` (new) |
| `components/comeback-artists.tsx` | ~108-114 | `No comeback artists found yet. Keep listening!` | — | `RotateCcw` (new) |
| `components/taste-badge.tsx` | ~47-52 | `No top artists yet.` | — | `Music2` (new) |
| `components/music-timeline.tsx` | ~63-69 | `No listening history found.` | — | `Clock` (already imported) |
| `components/tag-cloud.tsx` | ~97-102 | `No tags found.` | — | `Tag` (new) |
| `components/decade-breakdown.tsx` | ~131-137 | `No tag data found for this user.` | — | `Tag` (new) |
| `components/similar-unheard.tsx` | ~37-43 | `No suggestions found.` | `Listen to more artists so we can find similar ones you haven't heard.` | `Sparkles` (already imported) |
| `components/also-listened-sidebar.tsx` | ~72-74 | `No co-listening data found.` | — | `Users` (new) |
| `components/genre-breakdown.tsx` | ~38-42 | `No genre data available.` | — | `Tag` (new) |
| `components/album-completion.tsx` | ~48-54 | `No album data available.` | — | `Disc3` (new) |
| `components/yearly-top-album.tsx` | ~46-56 | `No album data available.` | — | `Disc3` (new) |
| `components/activity-feed.tsx` | ~194-198 | `No events to display yet.` | — | `Activity` (new) |
| `components/new-discoveries.tsx` | ~68-76 | `No new discoveries in this period.` | `Try a longer window to surface more first-time artists.` | `Compass` (already imported) |
| `components/milestones.tsx` | ~37-39 | `No milestones yet.` | — | `Trophy` (new) |
| `components/notifications-panel.tsx` | ~120-124 | `No notifications` | — | `Bell` (already imported) |
| `components/recent-tracks.tsx` | ~44-45 | `No tracks scrobbled yet.` | — | `Music` (new) |

- [ ] **Step 1:** Edit `components/artist-network.tsx` — replace with `<EmptyState icon={Users} title="No artist data available." size="compact" />`; add imports.
- [ ] **Step 2:** Edit `components/comeback-artists.tsx` — replace with `<EmptyState icon={RotateCcw} title="No comeback artists found yet. Keep listening!" size="compact" />`; add imports.
- [ ] **Step 3:** Edit `components/taste-badge.tsx` — replace with `<EmptyState icon={Music2} title="No top artists yet." size="compact" />`; add imports.
- [ ] **Step 4:** Edit `components/music-timeline.tsx` — replace with `<EmptyState icon={Clock} title="No listening history found." size="compact" />`; add `EmptyState` import (`Clock` already imported).
- [ ] **Step 5:** Edit `components/tag-cloud.tsx` — replace with `<EmptyState icon={Tag} title="No tags found." size="compact" />`; add imports.
- [ ] **Step 6:** Edit `components/decade-breakdown.tsx` — replace with `<EmptyState icon={Tag} title="No tag data found for this user." size="compact" />`; add imports.
- [ ] **Step 7:** Edit `components/similar-unheard.tsx` — replace with `<EmptyState icon={Sparkles} title="No suggestions found." description="Listen to more artists so we can find similar ones you haven't heard." size="compact" />`; add `EmptyState` import (`Sparkles` already imported).
- [ ] **Step 8:** Edit `components/also-listened-sidebar.tsx` — replace with `<EmptyState icon={Users} title="No co-listening data found." size="compact" />`; add imports.
- [ ] **Step 9:** Edit `components/genre-breakdown.tsx` — replace with `<EmptyState icon={Tag} title="No genre data available." size="compact" />`; add imports.
- [ ] **Step 10:** Edit `components/album-completion.tsx` — replace with `<EmptyState icon={Disc3} title="No album data available." size="compact" />`; add imports.
- [ ] **Step 11:** Edit `components/yearly-top-album.tsx` — replace with `<EmptyState icon={Disc3} title="No album data available." size="compact" />`; add imports.
- [ ] **Step 12:** Edit `components/activity-feed.tsx` — replace with `<EmptyState icon={Activity} title="No events to display yet." size="compact" />`; add imports.
- [ ] **Step 13:** Edit `components/new-discoveries.tsx` — replace with `<EmptyState icon={Compass} title="No new discoveries in this period." description="Try a longer window to surface more first-time artists." size="compact" />`; add `EmptyState` import (`Compass` already imported).
- [ ] **Step 14:** Edit `components/milestones.tsx` — replace with `<EmptyState icon={Trophy} title="No milestones yet." size="compact" />`; add imports.
- [ ] **Step 15:** Edit `components/notifications-panel.tsx` — replace with `<EmptyState icon={Bell} title="No notifications" size="compact" />`; add `EmptyState` import (`Bell` already imported).
- [ ] **Step 16:** Edit `components/recent-tracks.tsx` — replace with `<EmptyState icon={Music} title="No tracks scrobbled yet." size="compact" />`; add imports.
- [ ] **Step 17: Verify**

Run: `npx tsc --noEmit`
Expected: no errors in the 16 files touched above.

- [ ] **Step 18: Commit**

```bash
git add components/artist-network.tsx components/comeback-artists.tsx components/taste-badge.tsx components/music-timeline.tsx components/tag-cloud.tsx components/decade-breakdown.tsx components/similar-unheard.tsx components/also-listened-sidebar.tsx components/genre-breakdown.tsx components/album-completion.tsx components/yearly-top-album.tsx components/activity-feed.tsx components/new-discoveries.tsx components/milestones.tsx components/notifications-panel.tsx components/recent-tracks.tsx
git commit -m "refactor: migrate widget empty states to EmptyState (batch D)"
```

---

## Page Migration Tasks (Tasks 6–7)

Every page instance omits `size` (defaults to `"default"`), no `action`. Any existing separate CTA/link near an empty state (e.g. "Try another comparison", "Back to home", a year picker) is left exactly as-is, untouched, alongside the new `<EmptyState>`.

### Task 6: Migrate page empty states — batch E

| File | Line(s) | Title | Description | Icon (import status) |
|---|---|---|---|---|
| `app/discover/page.tsx` | ~89-94 | `No recommendations yet.` | `Keep scrobbling and sync your data to get personalized picks.` | `Sparkles` (new) |
| `app/search/page.tsx` | ~158-163 | `No results for "{q}"` *(preserve existing `q`/`type` interpolation)* | — | `SearchX` (new) |
| `app/charts/page.tsx` | ~36-37, ~67-68, ~98-99 (same file, one edit step) | `Could not load chart data` (×2) / `No personal chart data available yet` | — | `BarChart2` (new for first two), `TrendingUp` (new, for third) |
| `app/artist/[name]/page.tsx` | ~577-579, ~600-602, ~726-734, ~735-744 (same file, one edit step) | `No tracks found` (×2) / `Sign in or add ?username=yourname to see your personal stats.` / `You haven't scrobbled {artistName} yet, or the data hasn't synced.` | — | `Music2` (already imported, for the two "No tracks found") / `User` (new, for sign-in) / `Music2` (reuse, for the last one) |
| `app/genre/[name]/page.tsx` | ~387-394, ~570-578 (same file, one edit step) | `User {username} not found. Visit their profile first to sync data.` / `No data found for tag "{tagName}". The tag may not exist on Last.fm, or the API key may be missing.` | — | `Users` (already imported) / `Tag` (already imported) |
| `app/artist/[name]/discography/page.tsx` | ~218-222 | `No albums found for {artistName}` | — | `Disc3` (already imported) |
| `app/album/[...slug]/page.tsx` | ~30-38, ~42-49, ~62-76, ~138-140 (same file, one edit step) | `Sign in or pass ?username=X to view album data.` / `User {username} not found. Visit their profile first to sync data.` / `No scrobbles found for {albumName} by {artistName}.` / `No track data.` | — | `User` (new) / `Users` (new) / `Disc3` (new) / `Music2` (new) |
| `app/user/[username]/concerts/page.tsx` | ~182-186 | `No upcoming events found` | — | `Calendar` (already imported) |

- [ ] **Step 1:** Edit `app/discover/page.tsx` — replace the empty-state block with `<EmptyState icon={Sparkles} title="No recommendations yet." description="Keep scrobbling and sync your data to get personalized picks." />`; add imports.
- [ ] **Step 2:** Edit `app/search/page.tsx` — replace with `<EmptyState icon={SearchX} title={\`No results for "${q}"${type !== 'all' ? \` in ${type}\` : ''}.\`} />` (preserve the file's existing `q`/`type` variable names and conditional exactly as currently written); add imports.
- [ ] **Step 3:** Edit `app/charts/page.tsx` — replace the two "Could not load chart data" blocks (~36-37, ~67-68) with `<EmptyState icon={BarChart2} title="Could not load chart data" />` each, and the third block (~98-99) with `<EmptyState icon={TrendingUp} title="No personal chart data available yet" />`; add `EmptyState`, `BarChart2`, `TrendingUp` imports once for the file.
- [ ] **Step 4:** Edit `app/artist/[name]/page.tsx` — replace the two "No tracks found" blocks (~577-579, ~600-602) with `<EmptyState icon={Music2} title="No tracks found" />` each; replace the sign-in block (~726-734) with `<EmptyState icon={User} title="Sign in or add ?username=yourname to see your personal stats." />`; replace the not-scrobbled block (~735-744) with `<EmptyState icon={Music2} title={\`You haven't scrobbled ${artistName} yet, or the data hasn't synced.\`} />` (preserve the existing `artistName` variable name); add `EmptyState` and `User` imports (`Music2` already imported).
- [ ] **Step 5:** Edit `app/genre/[name]/page.tsx` — replace the user-not-found block (~387-394) with `<EmptyState icon={Users} title={\`User ${username} not found. Visit their profile first to sync data.\`} />`; replace the tag-not-found block (~570-578) with `<EmptyState icon={Tag} title={\`No data found for tag "${tagName}". The tag may not exist on Last.fm, or the API key may be missing.\`} />` (preserve existing `username`/`tagName` variable names); add `EmptyState` import (`Users`, `Tag` already imported).
- [ ] **Step 6:** Edit `app/artist/[name]/discography/page.tsx` — replace with `<EmptyState icon={Disc3} title={\`No albums found for ${artistName}\`} />` (preserve existing `artistName` variable name); add `EmptyState` import (`Disc3` already imported).
- [ ] **Step 7:** Edit `app/album/[...slug]/page.tsx` — replace the sign-in block (~30-38) with `<EmptyState icon={User} title="Sign in or pass ?username=X to view album data." />`; replace the user-not-found block (~42-49) with `<EmptyState icon={Users} title={\`User ${username} not found. Visit their profile first to sync data.\`} />`; replace the no-scrobbles block (~62-76) with `<EmptyState icon={Disc3} title={\`No scrobbles found for ${albumName} by ${artistName}.\`} />` (leave the separate back-link nav element above it untouched); replace the no-track-data block (~138-140) with `<EmptyState icon={Music2} title="No track data." />` (preserve existing `username`/`albumName`/`artistName` variable names); add `EmptyState`, `User`, `Users`, `Disc3`, `Music2` imports once for the file.
- [ ] **Step 8:** Edit `app/user/[username]/concerts/page.tsx` — replace with `<EmptyState icon={Calendar} title="No upcoming events found" />`; add `EmptyState` import (`Calendar` already imported).
- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit`
Expected: no errors in the 8 files touched above.

- [ ] **Step 10: Commit**

```bash
git add app/discover/page.tsx app/search/page.tsx app/charts/page.tsx "app/artist/[name]/page.tsx" "app/genre/[name]/page.tsx" "app/artist/[name]/discography/page.tsx" "app/album/[...slug]/page.tsx" "app/user/[username]/concerts/page.tsx"
git commit -m "refactor: migrate page empty states to EmptyState (batch E)"
```

---

### Task 7: Migrate page empty states — batch F

| File | Line(s) | Title | Description | Icon (import status) |
|---|---|---|---|---|
| `app/user/[username]/concerts/page.tsx` | ~256-262 | `No top artists found. Sync your scrobbles first.` | — | `Users` (new — note: this is a *second* edit in a file already touched in Task 6; that edit will already be committed by the time this task runs) |
| `app/user/[username]/reports/page.tsx` | ~190-191, ~211-212, ~279-280, ~300-301 (same file, one edit step) | `No scrobbles this week` / `No scrobbles last week` / `No scrobbles this month` / `No scrobbles last month` | — | `TrendingUp` (new, one import covers all four) |
| `app/user/[username]/wrapped/page.tsx` | ~216-224 | `No scrobbles found for {year}.` | `Try selecting a different year below.` | `Calendar` (new) — leave the year picker below untouched |
| `app/user/[username]/genres/page.tsx` | ~49-53, ~119-120 (same file, one edit step) | `No scrobbles found.` / `Not enough data to show genre eras.` | — | `Tag` (new, one import covers both blocks) |
| `app/user/[username]/history/page.tsx` | ~49-59, ~228-233 (same file, one edit step) | `User not found` *(title)* / `No data found for {username}.` *(description)* — and — `No scrobbles match your filters.` (when `isFiltered`) / `No scrobbles found.` (otherwise) | see above | `User` (new, for user-not-found) / `SearchX` (new, filtered) / `Music` (new, unfiltered) — leave the "Back to home" link untouched |
| `app/track/[artist]/[name]/page.tsx` | ~475-480, ~590-601 (same file, one edit step) | `You haven't scrobbled this track yet, or the data hasn't synced.` / `Sign in or add ?username=yourname to see your personal stats.` | — | `Music2` (already imported) / `User` (new) |
| `app/compare/[user1]/[user2]/page.tsx` | ~113-127, ~129-143 (same file, one edit step) | `User not found` *(title)* / `Could not find Last.fm user {user1}.` *(description)* — and the same shape for `{user2}` | see above | `Users` (new) — leave both "Try another comparison" links untouched |
| `app/leaderboard/page.tsx` | ~132-137 | `No listeners yet. Be the first!` | — | `Users` (already imported) |
| `app/album/[artist]/[name]/page.tsx` | ~179-184, ~654-662 (same file, one edit step) | `Album {albumName} by {artistName} was not found on Last.fm.` / `Sign in or add ?username=yourname to see your personal play counts and stats.` | — | `Disc3` (already imported) / `User` (new) |

- [ ] **Step 1:** Edit `app/user/[username]/concerts/page.tsx` — replace the "No top artists found" block with `<EmptyState icon={Users} title="No top artists found. Sync your scrobbles first." />` (leave the existing profile link untouched); add `Users` to the file's existing lucide-react import (`EmptyState` is already imported from Task 6's edit to this file).
- [ ] **Step 2:** Edit `app/user/[username]/reports/page.tsx` — replace all four blocks with `<EmptyState icon={TrendingUp} title="No scrobbles this week" />`, `<EmptyState icon={TrendingUp} title="No scrobbles last week" />`, `<EmptyState icon={TrendingUp} title="No scrobbles this month" />`, `<EmptyState icon={TrendingUp} title="No scrobbles last month" />` respectively; add `EmptyState` and `TrendingUp` imports once for the file.
- [ ] **Step 3:** Edit `app/user/[username]/wrapped/page.tsx` — replace with `<EmptyState icon={Calendar} title={\`No scrobbles found for ${year}.\`} description="Try selecting a different year below." />` (preserve the existing `year` variable name; leave the year picker below untouched); add imports.
- [ ] **Step 4:** Edit `app/user/[username]/genres/page.tsx` — replace the first block (~49-53) with `<EmptyState icon={Tag} title="No scrobbles found." />` and the second (~119-120) with `<EmptyState icon={Tag} title="Not enough data to show genre eras." />`; add `EmptyState` and `Tag` imports once for the file.
- [ ] **Step 5:** Edit `app/user/[username]/history/page.tsx` — replace the user-not-found block (~49-59) with `<EmptyState icon={User} title="User not found" description={\`No data found for ${username}.\`} />` (leave the "Back to home" link untouched, preserve the existing `username` variable name); replace the filtered/unfiltered block (~228-233) with a conditional: `isFiltered ? <EmptyState icon={SearchX} title="No scrobbles match your filters." /> : <EmptyState icon={Music} title="No scrobbles found." />` (preserve the existing `isFiltered` variable name); add `EmptyState`, `User`, `SearchX`, `Music` imports once for the file.
- [ ] **Step 6:** Edit `app/track/[artist]/[name]/page.tsx` — replace the not-scrobbled block (~475-480) with `<EmptyState icon={Music2} title="You haven't scrobbled this track yet, or the data hasn't synced." />`; replace the sign-in block (~590-601) with `<EmptyState icon={User} title="Sign in or add ?username=yourname to see your personal stats." />`; add `EmptyState` and `User` imports once for the file (`Music2` already imported).
- [ ] **Step 7:** Edit `app/compare/[user1]/[user2]/page.tsx` — replace the first user-not-found block (~113-127) with `<EmptyState icon={Users} title="User not found" description={\`Could not find Last.fm user ${user1}.\`} />` and the second (~129-143) with the same shape for `{user2}` (preserve existing `user1`/`user2` variable names; leave both "Try another comparison" links untouched); add `EmptyState` and `Users` imports once for the file.
- [ ] **Step 8:** Edit `app/leaderboard/page.tsx` — replace with `<EmptyState icon={Users} title="No listeners yet. Be the first!" />`; add `EmptyState` import (`Users` already imported).
- [ ] **Step 9:** Edit `app/album/[artist]/[name]/page.tsx` — replace the not-found block (~179-184) with `<EmptyState icon={Disc3} title={\`Album ${albumName} by ${artistName} was not found on Last.fm.\`} />` (preserve existing `albumName`/`artistName` variable names); replace the sign-in block (~654-662) with `<EmptyState icon={User} title="Sign in or add ?username=yourname to see your personal play counts and stats." />`; add `EmptyState` and `User` imports once for the file (`Disc3` already imported).
- [ ] **Step 10: Verify**

Run: `npx tsc --noEmit`
Expected: no errors in the files touched above.

- [ ] **Step 11: Commit**

```bash
git add "app/user/[username]/concerts/page.tsx" "app/user/[username]/reports/page.tsx" "app/user/[username]/wrapped/page.tsx" "app/user/[username]/genres/page.tsx" "app/user/[username]/history/page.tsx" "app/track/[artist]/[name]/page.tsx" "app/compare/[user1]/[user2]/page.tsx" app/leaderboard/page.tsx "app/album/[artist]/[name]/page.tsx"
git commit -m "refactor: migrate page empty states to EmptyState (batch F)"
```

---

## Out of scope (deliberately not migrated in this plan)

Per research findings, these don't fit the icon+title+description `EmptyState` shape and are left untouched:
- `components/compare-artists.tsx` (bare `"None"` in a 3-column grid)
- `components/taste-compatibility.tsx` (inline sentence inside a populated result panel)
- `components/wrapped-client.tsx` / `components/wrapped-year-summary.tsx` (`"No data"` as a one-word stat-card subtitle)
- `components/new-releases.tsx` per-item `"No image"` broken-artwork placeholder
- `components/listening-gap-alert.tsx` (an alert/notification banner, not a no-data state)
- `app/not-found.tsx` (global 404 route, already has its own icon+description)
- `app/compare/[user1]/[user2]/page.tsx` "All artists are shared!" (a success message, not an empty state)

If any of these turn out to need consistency treatment later, that's a follow-up task, not part of this plan.
