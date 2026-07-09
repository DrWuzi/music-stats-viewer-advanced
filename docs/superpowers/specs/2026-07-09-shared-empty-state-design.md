# Shared Empty-State Component — Design Spec

**Date:** 2026-07-09
**Status:** Approved

---

## Problem

Empty/no-data states are handled ad hoc across the codebase. At least 15+ dashboard widgets and several pages each write their own inline empty-state markup with inconsistent wording ("No data available.", "No data for this period.", "Not enough data yet — keep scrobbling!", "No recommendations found.", etc.) and inconsistent styling. There is no shared component in `components/ui/`.

## Goals

- One reusable, prop-configured empty-state component used consistently across dashboard widgets and pages.
- Two size variants: `compact` (dense dashboard widgets) and `default` (full-width page sections).
- Preserve existing per-context copy where it's meaningfully distinct; unify copy where multiple widgets say the same thing in different words.

## Non-Goals

- No illustration/SVG artwork — icon-only (lucide-react), no custom graphics.
- No animation.
- No changes to loading states — this covers empty/no-data states only, not skeletons/spinners.

## Component Design

**Location:** `components/ui/empty-state.tsx` (follows existing shadcn/ui convention alongside `components/ui/card.tsx` etc.)

**API:**

```tsx
<EmptyState
  icon={Music}                 // required: any lucide-react icon, chosen per call site for context
  title="No data for this period"
  description="Keep scrobbling to build up your history."  // optional
  size="compact" | "default"   // default: "default"
  action={{ label: "Sync now", href: "/settings" }}         // optional, only where a clear next step exists
/>
```

- `icon`: `LucideIcon` component reference, required. Each call site picks an icon relevant to its context (e.g. `Music` for scrobble-data widgets, `Users` for social/compare empty states, `SearchX` for search results).
- `title`: short bold heading, required.
- `description`: optional muted subtext line.
- `size`: `'compact' | 'default'`, defaults to `'default'`. `compact` uses a smaller icon and tighter padding for dashboard widget cards; `default` is used for full-page empty sections (e.g. `/discover`, `/search`).
- `action`: optional `{ label: string, href: string }`. Rendered as a small link/button below the description. Only included where an obvious next step exists (e.g. "Sync now", "Browse artists") — most widget-level empty states will omit it.

**Approach chosen:** a single component configured via props, rather than a compound-component pattern (`EmptyState.Icon` / `.Title` / etc.) or separate `WidgetEmptyState` / `PageEmptyState` components. Every existing empty state in the codebase is a simple icon+text(+optional action) shape — there's no case requiring arbitrary slot composition, so the simpler API avoids speculative flexibility.

## Migration

Replace inline empty-state markup with `<EmptyState>` in:

- **Dashboard widgets** (compact size): `components/you-might-like.tsx`, `components/top-lists.tsx`, `components/listening-treemap.tsx`, `components/artist-chart.tsx`, and other widgets under `components/` with ad hoc "no data" messages (full enumeration happens during implementation planning — grep for the known message strings plus any others found).
- **Pages** (default size): `/discover` ("No recommendations yet..."), `/search` ("No results for..."), and any other page-level empty sections found during implementation.

Where two widgets currently show near-duplicate copy for the same underlying condition (e.g. "No data available." vs "No data for this period." both meaning "no data for the selected period"), unify to one consistent phrasing. Where copy is genuinely context-specific (e.g. "No recommendations found." vs "Not enough data yet — keep scrobbling!"), preserve the distinct wording.

## Testing

No automated tests required — user will manually verify empty states render correctly across widgets/pages after implementation.
