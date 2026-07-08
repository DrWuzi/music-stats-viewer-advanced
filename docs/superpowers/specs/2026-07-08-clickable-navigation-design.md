# Clickable Dashboard Navigation — Design

## Context

Across the dashboard's ~49 widgets and detail pages, artist/album/track names are inconsistently linked. A handful of components (`top-lists.tsx`, `search`, a few others) already link to the relevant detail page; most chart/list/carousel components render names as plain text with no navigation. Separately, the three helper functions that build these links today are duplicated ad hoc per-file and inconsistent: `components/top-lists.tsx`'s `itemHref()` (for album/track) silently drops the `username` query param that its sibling `artistHref()` includes, even though the detail pages (`app/artist/[name]/page.tsx`, `app/track/[artist]/[name]/page.tsx`, `app/album/[artist]/[name]/page.tsx`) all consistently read `?username=` (falling back to the signed-in user's own username) to personalize stats shown on that page.

## Goals

- Every place in the app that displays an artist, album, or track *name as text* becomes a link to that entity's detail page, carrying the current profile's `username` forward the same way `top-lists.tsx` already does for artists.
- Centralize link-building in one module so every component builds URLs the same, correct way.
- Fix the existing `itemHref` bug (missing `username`) as part of this centralization, not as a separate task.

## Non-goals

- Recharts-rendered chart elements (bars, radar axes, tooltips, axis labels) are not linkified — they're rendered through Recharts' internal SVG/tooltip machinery, which doesn't compose with `<Link>`, and several charts (Sonic DNA, Music Evolution, Peak Year, etc.) plot abstract/aggregate metrics with no single artist to link to anyway.
- No new detail-page routes — `/artist/[name]`, `/album/[artist]/[name]`, `/track/[artist]/[name]`, `/genre/[name]` already exist and are reused as-is.
- No visual redesign of the linked elements beyond the hover treatment already established in `top-lists.tsx` (`hover:underline hover:text-primary`/`hover:text-foreground`).

## Architecture

### `lib/urls.ts` (new)

Single source of truth for entity URLs, replacing the local helpers in `top-lists.tsx` and any other ad hoc equivalents:

```ts
export function artistHref(name: string, username?: string): string {
  return `/artist/${encodeURIComponent(name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`
}

export function albumHref(artist: string, name: string, username?: string): string {
  return `/album/${encodeURIComponent(artist)}/${encodeURIComponent(name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`
}

export function trackHref(artist: string, name: string, username?: string): string {
  return `/track/${encodeURIComponent(artist)}/${encodeURIComponent(name)}${username ? `?username=${encodeURIComponent(username)}` : ''}`
}

export function genreHref(name: string): string {
  return `/genre/${encodeURIComponent(name)}`
}
```

This exactly mirrors the inline pattern already used identically in three separate detail pages (`${username ? \`?username=${encodeURIComponent(username)}\` : ''}`), just given one home.

### Two treatments for two kinds of surface

1. **Text/list/card surfaces** (the majority: list rows, carousel cards, bio mentions, recommendation cards, comeback/one-hit-wonder/longevity lists, etc.): wrap the name in `<Link href={...Href(...)}>` with the existing hover-underline classes from `top-lists.tsx`, exactly as that file already does for its own rows.
2. **Non-text/graph surfaces** (currently only `components/artist-network.tsx`, an SVG node graph): give each node an `onClick` handler that calls `useRouter().push(artistHref(node.name, username))`, plus `cursor-pointer` and a hover style, since `<Link>` doesn't compose cleanly with the custom SVG node rendering there.

### Username threading

Every component that needs to build one of these hrefs already either receives `username` as a prop (most dashboard widgets, since they're rendered inside a specific user's profile) or can read it from the same place its neighbors already do. No new prop-drilling infrastructure is needed — this only requires passing the value that's already available at each call site into the new shared helpers.

## Data flow

No data-model or API changes. This is a pure presentation-layer change: components that already receive artist/album/track names in their existing props/query results start rendering those names as `<Link>` instead of plain text, using `lib/urls.ts` to build the `href`.

## Testing

- Existing component tests that assert rendered text for artist/album/track names should still pass (text content is unchanged; only wrapped in a link now) — update any test that specifically asserts `container.querySelector('a')` absence.
- New unit tests for `lib/urls.ts`: each of the four helpers, with and without `username`, verifying `encodeURIComponent` is applied (e.g. an artist name containing `&` or `/`).
- Spot-check in the browser (dev server, port 4000): navigate from at least one list-based widget and one card/carousel-based widget into the artist detail page, and confirm the `username` query param round-trips (personalized stats still show on the destination page).
