# Clickable Dashboard Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every artist/album/track name shown anywhere in the dashboard becomes a link to its detail page, carrying the viewed profile's `username` so the destination page personalizes correctly.

**Architecture:** A new `lib/urls.ts` module is the single source of truth for building these links. Every other file in this plan imports from it rather than building URLs inline. Text-based surfaces get the name wrapped in `<Link>`; the one SVG-node surface (`artist-network.tsx`) gets `onClick` + `router.push`; two narrative-string surfaces (`activity-feed.tsx`, `scrobble-integrity.tsx`) get their label changed from `string` to `React.ReactNode` so the name can be a `<Link>` child within the sentence.

**Tech Stack:** Next.js App Router, `next/link`, Vitest + Testing Library.

## Global Constraints

- All hrefs go through `lib/urls.ts`'s `artistHref(name, username?)`, `albumHref(artist, name, username?)`, `trackHref(artist, name, username?)`, `genreHref(name)` — never build `/artist/...`/`/album/...`/`/track/...` paths inline anywhere touched by this plan.
- `username` is optional (`username?: string`) in every href helper (it's appended as `?username=...` only when present) — but component **props** for `username` are typed as a plain required `string` wherever the single call site (`components/user-profile.tsx`) already has a non-optional `username` in scope, matching the existing codebase convention (`components/top-lists.tsx`, `components/recent-tracks.tsx`, etc. all take `username: string`, not optional).
- Dev server runs on port 4000 (`npm run dev` → `next dev -p 4000`).
- Full test suite command: `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next` (stale leftover git-worktree directories under `.claude/worktrees/` pollute Vitest's default glob).
- Every task below was scoped from a live read of each file at plan-writing time. Line numbers are a precise pointer, not a guarantee — before editing, each implementer must open the file and match the quoted **current code** by content, not by line number alone, in case an earlier task in the same session shifted lines in a shared file (this matters most for `components/user-profile.tsx`, which nearly every task edits once, at a different, non-overlapping call site).
- Recharts-rendered chart internals (bars, tooltips, axis labels, legends) are explicitly out of scope everywhere in this plan — only text/list/card/badge/SVG-node surfaces outside of chart rendering are touched.

---

### Task 1: `lib/urls.ts` + fix existing `top-lists.tsx` href bug

**Files:**
- Create: `lib/urls.ts`
- Create: `tests/lib/urls.test.ts`
- Modify: `components/top-lists.tsx`

**Interfaces:**
- Produces: `artistHref(name: string, username?: string): string`, `albumHref(artist: string, name: string, username?: string): string`, `trackHref(artist: string, name: string, username?: string): string`, `genreHref(name: string): string` — every other task in this plan imports one or more of these from `@/lib/urls`.

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/urls.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { artistHref, albumHref, trackHref, genreHref } from '@/lib/urls'

describe('lib/urls', () => {
  it('artistHref builds a path without username', () => {
    expect(artistHref('Radiohead')).toBe('/artist/Radiohead')
  })

  it('artistHref appends an encoded username', () => {
    expect(artistHref('Radiohead', 'test user')).toBe('/artist/Radiohead?username=test%20user')
  })

  it('artistHref encodes special characters in the name', () => {
    expect(artistHref('AC/DC')).toBe('/artist/AC%2FDC')
  })

  it('albumHref builds a path with artist and album segments', () => {
    expect(albumHref('Radiohead', 'OK Computer', 'user')).toBe('/album/Radiohead/OK%20Computer?username=user')
  })

  it('albumHref omits the username query param when absent', () => {
    expect(albumHref('Radiohead', 'OK Computer')).toBe('/album/Radiohead/OK%20Computer')
  })

  it('trackHref builds a path with artist and track segments', () => {
    expect(trackHref('Radiohead', 'Karma Police', 'user')).toBe('/track/Radiohead/Karma%20Police?username=user')
  })

  it('genreHref builds a path from a genre name', () => {
    expect(genreHref('post-rock')).toBe('/genre/post-rock')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/lib/urls.test.ts`
Expected: FAIL — `Cannot find module '@/lib/urls'`

- [ ] **Step 3: Create `lib/urls.ts`**

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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/lib/urls.test.ts`
Expected: PASS (7/7)

- [ ] **Step 5: Refactor `components/top-lists.tsx` to use the shared helpers**

This file currently has its own local `itemHref`/`artistHref` (lines 29-38), and `itemHref` silently drops the `username` param for albums/tracks — this is the bug the shared helper fixes.

Current code (lines 29-38):
```tsx
function itemHref(item: Item, username: string, type: 'album' | 'track'): string {
  if (item.artist) {
    return `/${type}/${encodeURIComponent(item.artist)}/${encodeURIComponent(item.name)}`
  }
  return '#'
}

function artistHref(name: string, username: string): string {
  return `/artist/${encodeURIComponent(name)}?username=${encodeURIComponent(username)}`
}
```

Replace with (remove both local functions entirely, add the import instead):

```tsx
import { albumHref, artistHref, trackHref } from '@/lib/urls'
```

Add that import alongside the existing imports near the top of the file (after `import { SortMenu } from '@/components/sort-menu'`).

Current code (line 70):
```tsx
                href={itemHref(item, username, type)}
```
Replace with:
```tsx
                href={item.artist ? (type === 'album' ? albumHref(item.artist, item.name, username) : trackHref(item.artist, item.name, username)) : '#'}
```

Current code (line 198):
```tsx
      return album ? itemHref(album, username, 'album') : null
```
Replace with:
```tsx
      return album ? (album.artist ? albumHref(album.artist, album.name, username) : null) : null
```

Current code (line 202):
```tsx
      return track ? itemHref(track, username, 'track') : null
```
Replace with:
```tsx
      return track ? (track.artist ? trackHref(track.artist, track.name, username) : null) : null
```

Lines 80 and 140 (`artistHref(item.artist, username)` and `artistHref(artist.name, username)`) need no code change — they already call a function named `artistHref` with the same argument order; only the import source changes (from the local declaration to `@/lib/urls`), which Step 5's import line already handles.

- [ ] **Step 6: Run the existing top-lists tests to confirm no regression**

Run: `npx vitest run tests/components/top-lists.test.tsx`
Expected: PASS (2/2, unchanged)

- [ ] **Step 7: Commit**

```bash
git add lib/urls.ts tests/lib/urls.test.ts components/top-lists.tsx
git commit -m "feat: add shared href helpers and fix top-lists username bug"
```

---

### Task 2: Consistency fixes — already-linked components missing `username`

**Files:**
- Modify: `components/comeback-artists.tsx`
- Modify: `components/one-hit-wonders.tsx`
- Modify: `components/recent-artists-carousel.tsx`
- Modify: `components/album-of-month.tsx`
- Modify: `components/artist-longevity.tsx`
- Modify: `app/search/SearchClient.tsx`
- Modify: `components/user-profile.tsx` (5 call sites)

**Interfaces:**
- Consumes: `artistHref`, `albumHref` from Task 1's `@/lib/urls`.

- [ ] **Step 1: `components/comeback-artists.tsx`**

Current code:
```tsx
interface ComebackArtistsProps {
  scrobbles: Scrobble[]
}
```
```tsx
              <Link
                href={`/artist/${encodeURIComponent(artist.name)}`}
                className="text-sm font-semibold truncate hover:underline"
                style={{ color: 'var(--foreground)' }}
              >
                {artist.name}
              </Link>
```
Replace with:
```tsx
interface ComebackArtistsProps {
  scrobbles: Scrobble[]
  username: string
}
```
```tsx
              <Link
                href={artistHref(artist.name, username)}
                className="text-sm font-semibold truncate hover:underline"
                style={{ color: 'var(--foreground)' }}
              >
                {artist.name}
              </Link>
```
Add import: `import { artistHref } from '@/lib/urls'`. Update the function signature to destructure `username`: `export function ComebackArtists({ scrobbles, username }: ComebackArtistsProps) {`.

- [ ] **Step 2: `components/one-hit-wonders.tsx`**

Current code:
```tsx
interface OneHitWondersProps {
  scrobbles: Scrobble[]
}
```
```tsx
                  <Link
                    href={`/artist/${encodeURIComponent(artist)}`}
                    className="text-sm font-medium truncate hover:underline"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {artist}
                  </Link>
```
Replace with:
```tsx
interface OneHitWondersProps {
  scrobbles: Scrobble[]
  username: string
}
```
```tsx
                  <Link
                    href={artistHref(artist, username)}
                    className="text-sm font-medium truncate hover:underline"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {artist}
                  </Link>
```
Add import: `import { artistHref } from '@/lib/urls'`. Update signature: `export function OneHitWonders({ scrobbles, username }: OneHitWondersProps) {`.

- [ ] **Step 3: `components/recent-artists-carousel.tsx`**

Current code:
```tsx
interface RecentArtistsCarouselProps {
  scrobbles: Scrobble[]
}
```
```tsx
        {artists.map((artist) => (
          <Link
            key={artist}
            href={`/artist/${encodeURIComponent(artist)}`}
            className="flex flex-col items-center gap-1.5 min-w-[72px] max-w-[72px] shrink-0 group/item"
          >
```
Replace with:
```tsx
interface RecentArtistsCarouselProps {
  scrobbles: Scrobble[]
  username: string
}
```
```tsx
        {artists.map((artist) => (
          <Link
            key={artist}
            href={artistHref(artist, username)}
            className="flex flex-col items-center gap-1.5 min-w-[72px] max-w-[72px] shrink-0 group/item"
          >
```
Add import: `import { artistHref } from '@/lib/urls'`. Update signature: `export function RecentArtistsCarousel({ scrobbles, username }: RecentArtistsCarouselProps) {`.

- [ ] **Step 4: `components/album-of-month.tsx`**

Current code:
```tsx
interface AlbumOfMonthProps {
  scrobbles: Scrobble[]
}
```
```tsx
                      <Link
                        href={`/album/${encodeSegment(entry.artist)}/${encodeSegment(entry.album)}`}
                        className="block truncate font-medium leading-tight hover:underline"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {entry.album}
                      </Link>
                      <Link
                        href={`/artist/${encodeSegment(entry.artist)}`}
                        className="mt-0.5 block truncate text-sm hover:underline"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        {entry.artist}
                      </Link>
```
Replace with:
```tsx
interface AlbumOfMonthProps {
  scrobbles: Scrobble[]
  username: string
}
```
```tsx
                      <Link
                        href={albumHref(entry.artist, entry.album, username)}
                        className="block truncate font-medium leading-tight hover:underline"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {entry.album}
                      </Link>
                      <Link
                        href={artistHref(entry.artist, username)}
                        className="mt-0.5 block truncate text-sm hover:underline"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        {entry.artist}
                      </Link>
```
Add import: `import { albumHref, artistHref } from '@/lib/urls'`. Update signature: `export function AlbumOfMonth({ scrobbles, username }: AlbumOfMonthProps) {`. Remove the file's local `encodeSegment` helper if, after this change, it's no longer referenced anywhere else in the file (check with a grep for `encodeSegment` inside this file before deleting it).

- [ ] **Step 5: `components/artist-longevity.tsx`**

Current code:
```tsx
interface ArtistLongevityProps {
  scrobbles: { scrobbledAt: Date; artist: string }[]
}
```
```tsx
                  <a
                    href={`https://www.last.fm/music/${encodeURIComponent(artist.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium truncate hover:underline"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {artist.name}
                  </a>
```
Replace with:
```tsx
interface ArtistLongevityProps {
  scrobbles: { scrobbledAt: Date; artist: string }[]
  username: string
}
```
```tsx
                  <Link
                    href={artistHref(artist.name, username)}
                    className="text-sm font-medium truncate hover:underline"
                    style={{ color: 'var(--foreground)' }}
                  >
                    {artist.name}
                  </Link>
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'` (this file currently has no `Link` import at all). Update signature: `export function ArtistLongevity({ scrobbles, username }: ArtistLongevityProps) {`.

- [ ] **Step 6: `app/search/SearchClient.tsx`**

This file already has a `username: string` prop (line 57) and already navigates programmatically — keep it programmatic (it's a `<button onMouseDown>` inside a dropdown, specifically using `onMouseDown` so the click fires before the input's `onBlur` closes the dropdown; converting to `<Link>` risks breaking that ordering).

Current code:
```tsx
  const handleSuggestionClick = (name: string) => {
    addRecentSearch(name)
    router.push(`/artist/${encodeURIComponent(name)}`)
  }
```
Replace with:
```tsx
  const handleSuggestionClick = (name: string) => {
    addRecentSearch(name)
    router.push(artistHref(name, username))
  }
```
Add import: `import { artistHref } from '@/lib/urls'`. No other change needed in this file.

- [ ] **Step 7: Thread `username` at all five call sites in `components/user-profile.tsx`**

Current code:
```tsx
        return <RecentArtistsCarousel scrobbles={allScrobbles} />
```
Replace with:
```tsx
        return <RecentArtistsCarousel scrobbles={allScrobbles} username={username} />
```

Current code:
```tsx
        return <ComebackArtists scrobbles={allScrobbles} />
```
Replace with:
```tsx
        return <ComebackArtists scrobbles={allScrobbles} username={username} />
```

Current code:
```tsx
        return <ArtistLongevity scrobbles={allScrobbles} />
```
Replace with:
```tsx
        return <ArtistLongevity scrobbles={allScrobbles} username={username} />
```

Current code:
```tsx
        return <OneHitWonders scrobbles={allScrobbles} />
```
Replace with:
```tsx
        return <OneHitWonders scrobbles={allScrobbles} username={username} />
```

Current code:
```tsx
      case 'album-of-month':
        return (
          <AlbumOfMonth
            scrobbles={allScrobbles.map((s) => ({ ...s, album: null }))}
          />
        )
```
Replace with:
```tsx
      case 'album-of-month':
        return (
          <AlbumOfMonth
            scrobbles={allScrobbles.map((s) => ({ ...s, album: null }))}
            username={username}
          />
        )
```

- [ ] **Step 8: Run the type checker and existing component tests**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next`
Expected: no new failures beyond any already-known pre-existing ones.

- [ ] **Step 9: Commit**

```bash
git add components/comeback-artists.tsx components/one-hit-wonders.tsx components/recent-artists-carousel.tsx components/album-of-month.tsx components/artist-longevity.tsx app/search/SearchClient.tsx components/user-profile.tsx
git commit -m "fix: thread username through already-linked components for personalized stats"
```

---

### Task 3: Now Playing — expose `username` via context, link artist/track

**Files:**
- Modify: `components/now-playing-context.tsx`
- Modify: `components/now-playing.tsx`
- Modify: `components/now-playing-banner.tsx`
- Modify: `components/now-playing-mini.tsx`

**Interfaces:**
- Produces: `useNowPlaying()` now returns `{ data, isLoading, username }` instead of `{ data, isLoading }`.
- Consumes: `artistHref`, `trackHref` from Task 1's `@/lib/urls`.

- [ ] **Step 1: Expose `username` in the context value**

Current code (`components/now-playing-context.tsx`):
```tsx
type NowPlayingContextValue = {
  data: NowPlayingData | null
  isLoading: boolean
}
```
Replace with:
```tsx
type NowPlayingContextValue = {
  data: NowPlayingData | null
  isLoading: boolean
  username: string
}
```

Current code:
```tsx
const NowPlayingContext = createContext<NowPlayingContextValue>({
  data: null,
  isLoading: true,
})
```
Replace with:
```tsx
const NowPlayingContext = createContext<NowPlayingContextValue>({
  data: null,
  isLoading: true,
  username: '',
})
```

Current code:
```tsx
  return (
    <NowPlayingContext.Provider value={{ data, isLoading }}>
      {children}
    </NowPlayingContext.Provider>
  )
```
Replace with:
```tsx
  return (
    <NowPlayingContext.Provider value={{ data, isLoading, username }}>
      {children}
    </NowPlayingContext.Provider>
  )
```

- [ ] **Step 2: `components/now-playing.tsx`**

Current code (full file):
```tsx
'use client'

import { ArtistImage } from '@/components/artist-image'
import { ListenOn } from '@/components/listen-on'
import { useNowPlaying } from '@/components/now-playing-context'

export function NowPlaying() {
  const { data } = useNowPlaying()

  if (!data?.nowPlaying) return null

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-l-4 border-primary bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] rounded-r-lg text-sm w-full">
      {data.artist && (
        <ArtistImage name={data.artist} size="sm" className="shrink-0" />
      )}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="animate-pulse text-base leading-none" aria-label="Now playing">♫</span>
          <span className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Now Playing</span>
          <span className="relative flex h-2 w-2 shrink-0 ml-auto">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>
        <span className="font-semibold truncate leading-snug">{data.track}</span>
        {(data.artist || data.album) && (
          <span className="text-muted-foreground truncate text-xs">
            {data.artist}
            {data.artist && data.album && ' · '}
            {data.album}
          </span>
        )}
      </div>
      {data.artist && data.track && (
        <ListenOn type="track" artist={data.artist} track={data.track} variant="icons" />
      )}
    </div>
  )
}
```
Replace with:
```tsx
'use client'

import Link from 'next/link'
import { ArtistImage } from '@/components/artist-image'
import { ListenOn } from '@/components/listen-on'
import { useNowPlaying } from '@/components/now-playing-context'
import { artistHref, trackHref } from '@/lib/urls'

export function NowPlaying() {
  const { data, username } = useNowPlaying()

  if (!data?.nowPlaying) return null

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-l-4 border-primary bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] rounded-r-lg text-sm w-full">
      {data.artist && (
        <ArtistImage name={data.artist} size="sm" className="shrink-0" />
      )}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="animate-pulse text-base leading-none" aria-label="Now playing">♫</span>
          <span className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Now Playing</span>
          <span className="relative flex h-2 w-2 shrink-0 ml-auto">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>
        <span className="font-semibold truncate leading-snug">
          {data.artist && data.track ? (
            <Link href={trackHref(data.artist, data.track, username)} className="hover:underline">
              {data.track}
            </Link>
          ) : (
            data.track
          )}
        </span>
        {(data.artist || data.album) && (
          <span className="text-muted-foreground truncate text-xs">
            {data.artist && (
              <Link href={artistHref(data.artist, username)} className="hover:underline">
                {data.artist}
              </Link>
            )}
            {data.artist && data.album && ' · '}
            {data.album}
          </span>
        )}
      </div>
      {data.artist && data.track && (
        <ListenOn type="track" artist={data.artist} track={data.track} variant="icons" />
      )}
    </div>
  )
}
```

- [ ] **Step 3: `components/now-playing-banner.tsx`**

Current code (full file):
```tsx
'use client'

import { useNowPlaying } from '@/components/now-playing-context'

export function NowPlayingBanner() {
  const { data } = useNowPlaying()

  if (!data?.nowPlaying) return null

  return (
    <div
      className="w-full flex items-center gap-3 px-5 py-3 rounded-xl mb-4 border border-primary/20"
      style={{ background: 'color-mix(in oklch, var(--primary) 10%, transparent)' }}
    >
      <span className="animate-pulse text-xl leading-none select-none" aria-hidden="true">
        ♫
      </span>
      <span className="font-bold text-foreground text-sm tracking-wide uppercase shrink-0">
        Now playing:
      </span>
      <span className="font-bold text-foreground truncate">
        {data.track}
      </span>
      {data.artist && (
        <>
          <span className="text-muted-foreground shrink-0">—</span>
          <span className="text-muted-foreground font-medium truncate">
            {data.artist}
          </span>
        </>
      )}
    </div>
  )
}
```
Replace with:
```tsx
'use client'

import Link from 'next/link'
import { useNowPlaying } from '@/components/now-playing-context'
import { artistHref, trackHref } from '@/lib/urls'

export function NowPlayingBanner() {
  const { data, username } = useNowPlaying()

  if (!data?.nowPlaying) return null

  return (
    <div
      className="w-full flex items-center gap-3 px-5 py-3 rounded-xl mb-4 border border-primary/20"
      style={{ background: 'color-mix(in oklch, var(--primary) 10%, transparent)' }}
    >
      <span className="animate-pulse text-xl leading-none select-none" aria-hidden="true">
        ♫
      </span>
      <span className="font-bold text-foreground text-sm tracking-wide uppercase shrink-0">
        Now playing:
      </span>
      <span className="font-bold text-foreground truncate">
        {data.artist && data.track ? (
          <Link href={trackHref(data.artist, data.track, username)} className="hover:underline">
            {data.track}
          </Link>
        ) : (
          data.track
        )}
      </span>
      {data.artist && (
        <>
          <span className="text-muted-foreground shrink-0">—</span>
          <span className="text-muted-foreground font-medium truncate">
            <Link href={artistHref(data.artist, username)} className="hover:underline">
              {data.artist}
            </Link>
          </span>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: `components/now-playing-mini.tsx`**

Current code (lines 1-11):
```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useNowPlaying } from '@/components/now-playing-context'

export function NowPlayingMini() {
  const { data } = useNowPlaying()
  const [dismissed, setDismissed] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const progressAnim = useRef<number | null>(null)
```
Replace with:
```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useNowPlaying } from '@/components/now-playing-context'
import { artistHref, trackHref } from '@/lib/urls'

export function NowPlayingMini() {
  const { data, username } = useNowPlaying()
  const [dismissed, setDismissed] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const progressAnim = useRef<number | null>(null)
```

Current code (lines 59-68):
```tsx
      {/* Track info */}
      <span className="text-sm font-medium truncate flex-1 min-w-0">
        <span className="font-semibold">{data.track}</span>
        {data.artist && (
          <>
            <span className="mx-1.5 text-muted-foreground">—</span>
            <span className="text-muted-foreground">{data.artist}</span>
          </>
        )}
      </span>
```
Replace with:
```tsx
      {/* Track info */}
      <span className="text-sm font-medium truncate flex-1 min-w-0">
        <span className="font-semibold">
          {data.artist && data.track ? (
            <Link href={trackHref(data.artist, data.track, username)} className="hover:underline">
              {data.track}
            </Link>
          ) : (
            data.track
          )}
        </span>
        {data.artist && (
          <>
            <span className="mx-1.5 text-muted-foreground">—</span>
            <span className="text-muted-foreground">
              <Link href={artistHref(data.artist, username)} className="hover:underline">
                {data.artist}
              </Link>
            </span>
          </>
        )}
      </span>
```

- [ ] **Step 5: Run the type checker**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add components/now-playing-context.tsx components/now-playing.tsx components/now-playing-banner.tsx components/now-playing-mini.tsx
git commit -m "feat: link artist/track names in now-playing components"
```

---

### Task 4: Artist Network — clickable SVG nodes

**Files:**
- Modify: `components/artist-network.tsx`
- Modify: `components/user-profile.tsx` (1 call site)

**Interfaces:**
- Consumes: `artistHref` from `@/lib/urls`.

- [ ] **Step 1: Add `username` prop, router import, and click navigation**

Current code:
```tsx
'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArtistImage } from '@/components/artist-image'

interface Scrobble {
  scrobbledAt: Date
  artist: string
}

interface TopArtist {
  name: string
  playcount: number
}

interface Props {
  scrobbles: Scrobble[]
  topArtists: TopArtist[]
}
```
Replace with:
```tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArtistImage } from '@/components/artist-image'
import { artistHref } from '@/lib/urls'

interface Scrobble {
  scrobbledAt: Date
  artist: string
}

interface TopArtist {
  name: string
  playcount: number
}

interface Props {
  scrobbles: Scrobble[]
  topArtists: TopArtist[]
  username: string
}
```

Current code:
```tsx
export function ArtistNetwork({ scrobbles, topArtists }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
```
Replace with:
```tsx
export function ArtistNetwork({ scrobbles, topArtists, username }: Props) {
  const router = useRouter()
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
```

Current code (the node `div`):
```tsx
              <div
                key={node.artist.name}
                className="absolute flex items-center justify-center cursor-pointer transition-transform duration-150"
                style={{
                  left: node.x - node.r,
                  top: node.y - node.r,
                  width: node.r * 2,
                  height: node.r * 2,
                  transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                  opacity: dimmed ? 0.35 : 1,
                  zIndex: isHovered ? 10 : 1,
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                aria-label={node.artist.name}
              >
```
Replace with:
```tsx
              <div
                key={node.artist.name}
                role="button"
                tabIndex={0}
                className="absolute flex items-center justify-center cursor-pointer transition-transform duration-150"
                style={{
                  left: node.x - node.r,
                  top: node.y - node.r,
                  width: node.r * 2,
                  height: node.r * 2,
                  transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                  opacity: dimmed ? 0.35 : 1,
                  zIndex: isHovered ? 10 : 1,
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => router.push(artistHref(node.artist.name, username))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(artistHref(node.artist.name, username))
                  }
                }}
                aria-label={`View ${node.artist.name}`}
              >
```

- [ ] **Step 2: Thread `username` at the call site in `components/user-profile.tsx`**

Find the `case 'artist-connections':` (or equivalent widget id, per `lib/dashboard-widgets.ts`'s `'artist-connections'` entry) render call for `ArtistNetwork` and add `username={username}` to its props, matching the pattern used for every other call site in this plan (e.g. `<ArtistNetwork scrobbles={allScrobbles} topArtists={topArtistsOverall} username={username} />` — match whatever data props the existing call site already passes, only add `username`).

- [ ] **Step 3: Run the type checker**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/artist-network.tsx components/user-profile.tsx
git commit -m "feat: make artist-network graph nodes clickable"
```

---

### Task 5: Artist-only lists needing a new `username` prop

**Files:**
- Modify: `components/artist-loyalty.tsx`
- Modify: `components/chart-rise-fall.tsx`
- Modify: `components/first-listens.tsx`
- Modify: `components/diversity-score.tsx`
- Modify: `components/on-this-day.tsx`
- Modify: `components/marathon-sessions.tsx`
- Modify: `components/listening-chapters.tsx`
- Modify: `components/user-profile.tsx` (7 call sites)

**Interfaces:**
- Consumes: `artistHref` from `@/lib/urls`.

- [ ] **Step 1: `components/artist-loyalty.tsx`**

Current code:
```tsx
interface ArtistLoyaltyProps {
  topArtists: { name: string; playcount: number }[]
  totalScrobbles: number
}
```
```tsx
export function ArtistLoyalty({ topArtists, totalScrobbles }: ArtistLoyaltyProps) {
```
```tsx
              <span className="text-sm truncate flex-1 min-w-0">{s.name}</span>
```
Replace with:
```tsx
interface ArtistLoyaltyProps {
  topArtists: { name: string; playcount: number }[]
  totalScrobbles: number
  username: string
}
```
```tsx
export function ArtistLoyalty({ topArtists, totalScrobbles, username }: ArtistLoyaltyProps) {
```
```tsx
              <Link href={artistHref(s.name, username)} className="text-sm truncate flex-1 min-w-0 hover:underline hover:text-primary transition-colors">{s.name}</Link>
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

- [ ] **Step 2: `components/chart-rise-fall.tsx`**

Current code:
```tsx
interface ChartRiseFallProps {
  topArtists: Record<string, ArtistPeriod[]>
}
```
```tsx
export function ChartRiseFall({ topArtists }: ChartRiseFallProps) {
```
Replace with:
```tsx
interface ChartRiseFallProps {
  topArtists: Record<string, ArtistPeriod[]>
  username: string
}
```
```tsx
export function ChartRiseFall({ topArtists, username }: ChartRiseFallProps) {
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

This file renders `<span className="flex-1 text-sm font-medium truncate">{artist.name}</span>` three times (risers section, fallers section, new-artists section) — replace **each** of the three occurrences with:
```tsx
                <Link href={artistHref(artist.name, username)} className="flex-1 text-sm font-medium truncate hover:underline hover:text-primary transition-colors">{artist.name}</Link>
```

- [ ] **Step 3: `components/first-listens.tsx`**

Current code:
```tsx
interface FirstListensProps {
  scrobbles: Scrobble[]
}
```
```tsx
export function FirstListens({ scrobbles }: FirstListensProps) {
```
```tsx
                <span
                  className="font-medium truncate"
                  style={{ color: 'var(--foreground)' }}
                >
                  {artist}
                </span>
```
Replace with:
```tsx
interface FirstListensProps {
  scrobbles: Scrobble[]
  username: string
}
```
```tsx
export function FirstListens({ scrobbles, username }: FirstListensProps) {
```
```tsx
                <Link
                  href={artistHref(artist, username)}
                  className="font-medium truncate hover:underline hover:text-primary transition-colors"
                  style={{ color: 'var(--foreground)' }}
                >
                  {artist}
                </Link>
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

- [ ] **Step 4: `components/diversity-score.tsx`**

Current code:
```tsx
interface DiversityScoreProps {
  topArtists: { name: string; playcount: number }[]
  totalScrobbles: number
}
```
```tsx
export function DiversityScore({ topArtists, totalScrobbles }: DiversityScoreProps) {
```
```tsx
                <span
                  className="w-28 truncate text-right text-xs text-[var(--muted-foreground)]"
                  title={artist.name}
                >
                  {artist.name}
                </span>
```
Replace with:
```tsx
interface DiversityScoreProps {
  topArtists: { name: string; playcount: number }[]
  totalScrobbles: number
  username: string
}
```
```tsx
export function DiversityScore({ topArtists, totalScrobbles, username }: DiversityScoreProps) {
```
```tsx
                <Link
                  href={artistHref(artist.name, username)}
                  className="w-28 truncate text-right text-xs text-[var(--muted-foreground)] hover:underline hover:text-primary transition-colors"
                  title={artist.name}
                >
                  {artist.name}
                </Link>
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

- [ ] **Step 5: `components/on-this-day.tsx`**

Current code:
```tsx
interface OnThisDayProps {
  scrobbles: Scrobble[]
}
```
```tsx
export function OnThisDay({ scrobbles }: OnThisDayProps) {
```
```tsx
                  {topArtists.map(({ name, count }) => (
                    <div key={name} className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </div>
                  ))}
```
Replace with:
```tsx
interface OnThisDayProps {
  scrobbles: Scrobble[]
  username: string
}
```
```tsx
export function OnThisDay({ scrobbles, username }: OnThisDayProps) {
```
```tsx
                  {topArtists.map(({ name, count }) => (
                    <div key={name} className="flex items-center gap-1.5">
                      <Link href={artistHref(name, username)} className="hover:underline hover:text-primary transition-colors">
                        <Badge variant="secondary" className="text-xs">
                          {name}
                        </Badge>
                      </Link>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </div>
                  ))}
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

- [ ] **Step 6: `components/marathon-sessions.tsx`**

Current code:
```tsx
export function MarathonSessions({ scrobbles }: { scrobbles: Scrobble[] }) {
```
```tsx
                    <div className="mt-0.5 text-xs text-muted-foreground truncate">
                      Top artist: <span className="font-medium text-foreground">{session.topArtist}</span>
                    </div>
```
Replace with:
```tsx
export function MarathonSessions({ scrobbles, username }: { scrobbles: Scrobble[]; username: string }) {
```
```tsx
                    <div className="mt-0.5 text-xs text-muted-foreground truncate">
                      Top artist: <Link href={artistHref(session.topArtist, username)} className="font-medium text-foreground hover:underline hover:text-primary transition-colors">{session.topArtist}</Link>
                    </div>
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

- [ ] **Step 7: `components/listening-chapters.tsx`**

Current code:
```tsx
interface ListeningChaptersProps {
  scrobbles: { scrobbledAt: Date | string; artist: string }[]
  totalScrobbles: number
  registeredAt: Date | string
}
```
```tsx
function ChapterCard({ chapter, isLast }: { chapter: Chapter; isLast: boolean }) {
```
```tsx
            <p className="text-sm leading-relaxed">
              In {year},{' '}
              <span className="font-semibold" style={{ color: 'var(--primary)' }}>
                {topArtist}
              </span>{' '}
```
Replace with:
```tsx
interface ListeningChaptersProps {
  scrobbles: { scrobbledAt: Date | string; artist: string }[]
  totalScrobbles: number
  registeredAt: Date | string
  username: string
}
```
```tsx
function ChapterCard({ chapter, isLast, username }: { chapter: Chapter; isLast: boolean; username: string }) {
```
```tsx
            <p className="text-sm leading-relaxed">
              In {year},{' '}
              <Link href={artistHref(topArtist, username)} className="font-semibold hover:underline hover:text-primary transition-colors" style={{ color: 'var(--primary)' }}>
                {topArtist}
              </Link>{' '}
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

Also update the top-level component signature and its `ChapterCard` call site to thread `username` down:
```tsx
export function ListeningChapters({
  scrobbles,
  totalScrobbles,
  registeredAt,
  username,
}: ListeningChaptersProps) {
```
```tsx
          {chapters.map((chapter, idx) => (
            <ChapterCard
              key={chapter.year}
              chapter={chapter}
              isLast={idx === chapters.length - 1}
              username={username}
            />
          ))}
```

- [ ] **Step 8: Thread `username` at all 7 call sites in `components/user-profile.tsx`**

For each of the seven components above, find its render call inside `renderWidget` and add `username={username}` to its existing props, e.g.:
```tsx
<ArtistLoyalty topArtists={topArtistsOverall} totalScrobbles={totalScrobbles} username={username} />
<ChartRiseFall topArtists={topArtists} username={username} />
<FirstListens scrobbles={allScrobbles.map((s) => ({ ...s, album: null }))} username={username} />
<DiversityScore topArtists={topArtistsOverall} totalScrobbles={totalScrobbles} username={username} />
<OnThisDay scrobbles={allScrobbles} username={username} />
<MarathonSessions scrobbles={allScrobbles} username={username} />
<ListeningChapters scrobbles={allScrobbles} totalScrobbles={totalScrobbles} registeredAt={registeredAt} username={username} />
```
(Keep each call site's existing data props exactly as they are today — only add `username={username}`.)

- [ ] **Step 9: Run the type checker and test suite**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next`
Expected: no new failures beyond any already-known pre-existing ones.

- [ ] **Step 10: Commit**

```bash
git add components/artist-loyalty.tsx components/chart-rise-fall.tsx components/first-listens.tsx components/diversity-score.tsx components/on-this-day.tsx components/marathon-sessions.tsx components/listening-chapters.tsx components/user-profile.tsx
git commit -m "feat: make artist names clickable in artist-only list widgets"
```

---

### Task 6: Comparison pages + narrative-string restructuring

**Files:**
- Modify: `components/top-collaborations.tsx`
- Modify: `components/compare-artists.tsx`
- Modify: `app/compare/[user1]/[user2]/page.tsx`
- Modify: `components/activity-feed.tsx`
- Modify: `components/scrobble-integrity.tsx`
- Modify: `components/user-profile.tsx` (2 call sites)

**Interfaces:**
- Consumes: `artistHref`, `trackHref` from `@/lib/urls`.

- [ ] **Step 1: `components/top-collaborations.tsx`**

Current code:
```tsx
interface TopCollaborationsProps {
  scrobbles: Scrobble[]
}
```
```tsx
export function TopCollaborations({ scrobbles }: TopCollaborationsProps) {
```
```tsx
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ArtistImage name={pair.artist1} size="sm" />
              <span className="text-[var(--muted-foreground)] text-sm font-medium shrink-0">×</span>
              <ArtistImage name={pair.artist2} size="sm" />
              <div className="min-w-0 flex-1 ml-1">
                <p className="text-sm font-medium leading-tight truncate">
                  {pair.artist1} &amp; {pair.artist2}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {pair.count} session{pair.count !== 1 ? 's' : ''} together
                </p>
              </div>
            </div>
```
Replace with:
```tsx
interface TopCollaborationsProps {
  scrobbles: Scrobble[]
  username: string
}
```
```tsx
export function TopCollaborations({ scrobbles, username }: TopCollaborationsProps) {
```
```tsx
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ArtistImage name={pair.artist1} size="sm" />
              <span className="text-[var(--muted-foreground)] text-sm font-medium shrink-0">×</span>
              <ArtistImage name={pair.artist2} size="sm" />
              <div className="min-w-0 flex-1 ml-1">
                <p className="text-sm font-medium leading-tight truncate">
                  <Link href={artistHref(pair.artist1, username)} className="hover:underline">
                    {pair.artist1}
                  </Link>
                  {' & '}
                  <Link href={artistHref(pair.artist2, username)} className="hover:underline">
                    {pair.artist2}
                  </Link>
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {pair.count} session{pair.count !== 1 ? 's' : ''} together
                </p>
              </div>
            </div>
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

- [ ] **Step 2: `components/compare-artists.tsx`**

This component has `user1`/`user2` props (not `username`) — use `user1` as the `artistHref` username argument in all three columns below, since this is a comparison view scoped to those two specific users.

Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

Current code ("Only user1" column):
```tsx
            uniqueToUser1.map((a) => (
              <Badge key={a.name} variant="outline" className="truncate justify-center text-xs">
                {a.name}
              </Badge>
            ))
```
Replace with:
```tsx
            uniqueToUser1.map((a) => (
              <Badge key={a.name} variant="outline" className="truncate justify-center text-xs">
                <Link href={artistHref(a.name, user1)} className="hover:underline">
                  {a.name}
                </Link>
              </Badge>
            ))
```

Current code ("Both Love" column):
```tsx
            topShared.map((a) => (
              <Badge key={a.name} variant="default" className="truncate justify-center text-xs">
                {a.name}
              </Badge>
            ))
```
Replace with:
```tsx
            topShared.map((a) => (
              <Badge key={a.name} variant="default" className="truncate justify-center text-xs">
                <Link href={artistHref(a.name, user1)} className="hover:underline">
                  {a.name}
                </Link>
              </Badge>
            ))
```

Current code ("Only user2" column):
```tsx
            uniqueToUser2.map((a) => (
              <Badge key={a.name} variant="outline" className="truncate justify-center text-xs">
                {a.name}
              </Badge>
            ))
```
Replace with:
```tsx
            uniqueToUser2.map((a) => (
              <Badge key={a.name} variant="outline" className="truncate justify-center text-xs">
                <Link href={artistHref(a.name, user1)} className="hover:underline">
                  {a.name}
                </Link>
              </Badge>
            ))
```

- [ ] **Step 3: `app/compare/[user1]/[user2]/page.tsx`**

This file already imports `Link` from `next/link`. Add `import { artistHref } from '@/lib/urls'`. Same "use `user1`" convention as Step 2.

Current code (shared-artist card grid):
```tsx
                  <ArtistImage name={a.name} size="md" />
                  <p className="text-sm font-medium leading-tight line-clamp-2">{a.name}</p>
```
Replace with:
```tsx
                  <ArtistImage name={a.name} size="md" />
                  <Link href={artistHref(a.name, user1)} className="text-sm font-medium leading-tight line-clamp-2 hover:underline">
                    {a.name}
                  </Link>
```

Current code (unique-to-user1 list, and identical structure repeated for unique-to-user2):
```tsx
                    <ArtistImage name={a.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {parseInt(a.playcount, 10).toLocaleString()} plays
                      </p>
                    </div>
```
Replace with (apply this same replacement in both the unique-to-user1 `.map` and the unique-to-user2 `.map`):
```tsx
                    <ArtistImage name={a.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link href={artistHref(a.name, user1)} className="text-sm font-medium truncate hover:underline block">
                        {a.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {parseInt(a.playcount, 10).toLocaleString()} plays
                      </p>
                    </div>
```

- [ ] **Step 4: `components/activity-feed.tsx`**

Current code:
```tsx
interface ActivityFeedProps {
  scrobbles: Scrobble[]
  totalScrobbles: number
  registeredAt: Date
}
```
```tsx
interface FeedEvent {
  date: Date
  type: EventType
  label: string
}
```
```tsx
function buildEvents(
  scrobbles: Scrobble[],
  totalScrobbles: number,
): FeedEvent[] {
```
Replace with:
```tsx
interface ActivityFeedProps {
  scrobbles: Scrobble[]
  totalScrobbles: number
  registeredAt: Date
  username: string
}
```
```tsx
interface FeedEvent {
  date: Date
  type: EventType
  label: React.ReactNode
}
```
```tsx
function buildEvents(
  scrobbles: Scrobble[],
  totalScrobbles: number,
  username: string,
): FeedEvent[] {
```

Current code (first-listened event):
```tsx
  for (const artist of top10Artists) {
    const first = artistFirstSeen.get(artist)
    if (first) {
      events.push({
        date: first.date,
        type: 'first-artist',
        label: `🎵 First listened to ${artist}`,
      })
    }
  }
```
Replace with:
```tsx
  for (const artist of top10Artists) {
    const first = artistFirstSeen.get(artist)
    if (first) {
      events.push({
        date: first.date,
        type: 'first-artist',
        label: (
          <>
            🎵 First listened to{' '}
            <Link href={artistHref(artist, username)} className="hover:underline font-medium">
              {artist}
            </Link>
          </>
        ),
      })
    }
  }
```

Current code (last-played event):
```tsx
  // --- Most recent scrobble ---
  const latest = sorted[sorted.length - 1]
  if (latest) {
    events.push({
      date: toDate(latest.scrobbledAt),
      type: 'recent',
      label: `🎧 Last played: ${latest.track} — ${latest.artist}`,
    })
  }
```
Replace with:
```tsx
  // --- Most recent scrobble ---
  const latest = sorted[sorted.length - 1]
  if (latest) {
    events.push({
      date: toDate(latest.scrobbledAt),
      type: 'recent',
      label: (
        <>
          🎧 Last played:{' '}
          <Link href={trackHref(latest.artist, latest.track, username)} className="hover:underline font-medium">
            {latest.track}
          </Link>
          {' — '}
          <Link href={artistHref(latest.artist, username)} className="hover:underline">
            {latest.artist}
          </Link>
        </>
      ),
    })
  }
```

Current code (component body):
```tsx
export function ActivityFeed({ scrobbles, totalScrobbles, registeredAt }: ActivityFeedProps) {
  const events = useMemo(
    () => buildEvents(scrobbles, totalScrobbles),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scrobbles, totalScrobbles],
  )
```
Replace with:
```tsx
export function ActivityFeed({ scrobbles, totalScrobbles, registeredAt, username }: ActivityFeedProps) {
  const events = useMemo(
    () => buildEvents(scrobbles, totalScrobbles, username),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scrobbles, totalScrobbles, username],
  )
```

Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`. The existing `{event.label}` render call needs no change — it already renders whatever `label` holds, and `label`'s type is now `React.ReactNode`.

- [ ] **Step 5: `components/scrobble-integrity.tsx`**

Current code:
```tsx
interface ScrobbleIntegrityProps {
  scrobbles: { scrobbledAt: Date | string; artist: string; track: string }[]
}
```
```tsx
interface Finding {
  icon: React.ReactNode
  message: string
  variant: 'warning' | 'success' | 'info'
}
```
```tsx
function analyzeScrobbles(
  scrobbles: { scrobbledAt: Date | string; artist: string; track: string }[]
): Finding[] {
```
Replace with:
```tsx
interface ScrobbleIntegrityProps {
  scrobbles: { scrobbledAt: Date | string; artist: string; track: string }[]
  username: string
}
```
```tsx
interface Finding {
  icon: React.ReactNode
  message: React.ReactNode
  variant: 'warning' | 'success' | 'info'
}
```
```tsx
function analyzeScrobbles(
  scrobbles: { scrobbledAt: Date | string; artist: string; track: string }[],
  username: string,
): Finding[] {
```

Current code (repeat-storm finding):
```tsx
        findings.push({
          icon: <Repeat className="h-4 w-4" />,
          message: `"${track}" by ${artist} played ${count}× on ${formatted}`,
          variant: 'info',
        })
```
Replace with:
```tsx
        findings.push({
          icon: <Repeat className="h-4 w-4" />,
          message: (
            <>
              &quot;
              <Link href={trackHref(artist, track, username)} className="hover:underline font-medium">
                {track}
              </Link>
              &quot; by{' '}
              <Link href={artistHref(artist, username)} className="hover:underline font-medium">
                {artist}
              </Link>
              {' '}played {count}× on {formatted}
            </>
          ),
          variant: 'info',
        })
```

Current code (component body):
```tsx
export function ScrobbleIntegrity({ scrobbles }: ScrobbleIntegrityProps) {
  const findings = useMemo(() => analyzeScrobbles(scrobbles), [scrobbles])
```
Replace with:
```tsx
export function ScrobbleIntegrity({ scrobbles, username }: ScrobbleIntegrityProps) {
  const findings = useMemo(() => analyzeScrobbles(scrobbles, username), [scrobbles, username])
```

Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`. No change needed where `{f.message}` is rendered — it already accepts the now-`React.ReactNode` type.

- [ ] **Step 6: Thread `username` at the two remaining call sites in `components/user-profile.tsx`**

Current code:
```tsx
<ScrobbleIntegrity scrobbles={allScrobbles} />
```
Replace with:
```tsx
<ScrobbleIntegrity scrobbles={allScrobbles} username={username} />
```

Current code:
```tsx
case 'activity-feed':
  return (
    <ActivityFeed
      scrobbles={allScrobbles}
      totalScrobbles={totalScrobbles}
      registeredAt={registeredAt}
    />
  )
```
Replace with:
```tsx
case 'activity-feed':
  return (
    <ActivityFeed
      scrobbles={allScrobbles}
      totalScrobbles={totalScrobbles}
      registeredAt={registeredAt}
      username={username}
    />
  )
```

Also add `username={username}` to the existing `<TopCollaborations scrobbles={allScrobbles} />` call site (from Step 1) — same pattern as every other task.

- [ ] **Step 7: Run the type checker and test suite**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next`
Expected: no new failures beyond any already-known pre-existing ones.

- [ ] **Step 8: Commit**

```bash
git add components/top-collaborations.tsx components/compare-artists.tsx "app/compare/[user1]/[user2]/page.tsx" components/activity-feed.tsx components/scrobble-integrity.tsx components/user-profile.tsx
git commit -m "feat: link artist/track names in comparison pages and narrative widgets"
```

---

### Task 7: Artist-only lists that already have `username`

**Files:**
- Modify: `components/you-might-like.tsx`
- Modify: `components/listening-friends.tsx`
- Modify: `components/new-discoveries.tsx`
- Modify: `components/rediscovery.tsx`
- Modify: `components/music-timeline.tsx`
- Modify: `components/taste-badge.tsx`
- Modify: `components/taste-compatibility.tsx`

**Interfaces:**
- Consumes: `artistHref` from `@/lib/urls`. All seven components already receive `username: string` as a prop — no call-site changes needed in this task.

- [ ] **Step 1: `components/you-might-like.tsx`**

Current code:
```tsx
                <ArtistImage name={rec.name} size="md" className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{rec.name}</p>
                </div>
```
Replace with:
```tsx
                <ArtistImage name={rec.name} size="md" className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    <Link
                      href={artistHref(rec.name, username)}
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {rec.name}
                    </Link>
                  </p>
                </div>
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

- [ ] **Step 2: `components/listening-friends.tsx`**

This file already imports `Link` from `next/link` — only add `import { artistHref } from '@/lib/urls'`.

Current code:
```tsx
              {exampleArtists.map((artist) => (
                <span
                  key={artist.name}
                  className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border"
                  style={{
                    backgroundColor: 'color-mix(in oklch, var(--primary) 12%, transparent)',
                    borderColor: 'color-mix(in oklch, var(--primary) 30%, transparent)',
                    color: 'var(--foreground)',
                  }}
                >
                  {artist.name}
                </span>
              ))}
```
Replace with:
```tsx
              {exampleArtists.map((artist) => (
                <span
                  key={artist.name}
                  className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border"
                  style={{
                    backgroundColor: 'color-mix(in oklch, var(--primary) 12%, transparent)',
                    borderColor: 'color-mix(in oklch, var(--primary) 30%, transparent)',
                    color: 'var(--foreground)',
                  }}
                >
                  <Link
                    href={artistHref(artist.name, username)}
                    className="hover:underline hover:text-primary transition-colors"
                  >
                    {artist.name}
                  </Link>
                </span>
              ))}
```

- [ ] **Step 3: `components/new-discoveries.tsx`**

Current code:
```tsx
                <div
                  key={d.artist}
                  className="flex flex-col gap-0.5 rounded-lg border bg-card px-3 py-2"
                >
                  <span className="text-sm font-medium">{d.artist}</span>
                  <span className="text-xs text-muted-foreground">
                    first heard {ago === 0 ? 'today' : `${ago}d ago`}
                  </span>
                  <Badge variant="secondary" className="mt-1 w-fit">
                    {d.playcount} {d.playcount === 1 ? 'play' : 'plays'}
                  </Badge>
                </div>
```
Replace with:
```tsx
                <div
                  key={d.artist}
                  className="flex flex-col gap-0.5 rounded-lg border bg-card px-3 py-2"
                >
                  <Link
                    href={artistHref(d.artist, username)}
                    className="text-sm font-medium hover:underline hover:text-primary transition-colors"
                  >
                    {d.artist}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    first heard {ago === 0 ? 'today' : `${ago}d ago`}
                  </span>
                  <Badge variant="secondary" className="mt-1 w-fit">
                    {d.playcount} {d.playcount === 1 ? 'play' : 'plays'}
                  </Badge>
                </div>
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

- [ ] **Step 4: `components/rediscovery.tsx`**

Current code:
```tsx
                <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.artist}</p>
                  <p className="text-xs text-muted-foreground">
```
Replace with:
```tsx
                <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    <Link
                      href={artistHref(r.artist, username)}
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {r.artist}
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground">
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

- [ ] **Step 5: `components/music-timeline.tsx`**

Current code:
```tsx
                      <span className="text-sm">
                        You first heard{' '}
                        <span className="font-medium">{d.artist}</span>{' '}
                        <span className="text-muted-foreground">
```
Replace with:
```tsx
                      <span className="text-sm">
                        You first heard{' '}
                        <Link
                          href={artistHref(d.artist, username)}
                          className="font-medium hover:underline hover:text-primary transition-colors"
                        >
                          {d.artist}
                        </Link>{' '}
                        <span className="text-muted-foreground">
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

- [ ] **Step 6: `components/taste-badge.tsx`**

Note: this component's `username` prop is also used elsewhere in the file to display the profile owner's own name (e.g. `<div className="text-lg font-bold">{username}</div>`) — do not touch that; only the artist list below changes.

Current code:
```tsx
          <ul className="mt-2 space-y-1">
            {top3.map((artist, idx) => (
              <li key={artist.name} className="text-sm flex items-center gap-2">
                <span className="text-muted-foreground text-xs w-4">{idx + 1}.</span>
                <span className="font-medium">{artist.name}</span>
              </li>
            ))}
          </ul>
```
Replace with:
```tsx
          <ul className="mt-2 space-y-1">
            {top3.map((artist, idx) => (
              <li key={artist.name} className="text-sm flex items-center gap-2">
                <span className="text-muted-foreground text-xs w-4">{idx + 1}.</span>
                <Link
                  href={artistHref(artist.name, username)}
                  className="font-medium hover:underline hover:text-primary transition-colors"
                >
                  {artist.name}
                </Link>
              </li>
            ))}
          </ul>
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

- [ ] **Step 7: `components/taste-compatibility.tsx`**

`result.matchingArtists` is rendered as one `<span>` per artist already (not a single joined string), so no splitting logic is needed.

Current code:
```tsx
            {result.matchingArtists.length > 0 && (
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Because you listen to{' '}
                {result.matchingArtists.slice(0, 5).map((a, i) => (
                  <span key={a}>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>{a}</span>
                    {i < Math.min(result.matchingArtists.length, 5) - 1 ? ', ' : ''}
                  </span>
                ))}
                {result.matchingArtists.length > 5 && ` and ${result.matchingArtists.length - 5} more…`}
              </p>
            )}
```
Replace with:
```tsx
            {result.matchingArtists.length > 0 && (
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Because you listen to{' '}
                {result.matchingArtists.slice(0, 5).map((a, i) => (
                  <span key={a}>
                    <Link
                      href={artistHref(a, username)}
                      className="font-medium hover:underline hover:text-primary transition-colors"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {a}
                    </Link>
                    {i < Math.min(result.matchingArtists.length, 5) - 1 ? ', ' : ''}
                  </span>
                ))}
                {result.matchingArtists.length > 5 && ` and ${result.matchingArtists.length - 5} more…`}
              </p>
            )}
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`.

- [ ] **Step 8: Run the type checker and test suite**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next`
Expected: no new failures beyond any already-known pre-existing ones.

- [ ] **Step 9: Commit**

```bash
git add components/you-might-like.tsx components/listening-friends.tsx components/new-discoveries.tsx components/rediscovery.tsx components/music-timeline.tsx components/taste-badge.tsx components/taste-compatibility.tsx
git commit -m "feat: make artist names clickable in recommendation and taste widgets"
```

---

### Task 8: Artist+track widgets that already have `username`

**Files:**
- Modify: `components/hidden-gems.tsx`
- Modify: `components/underrated-tracks.tsx`
- Modify: `components/infinite-track-list.tsx`
- Modify: `components/stats-chart.tsx`
- Modify: `components/repeat-plays.tsx`
- Modify: `components/wrapped-year-summary.tsx`
- Modify: `components/wrapped-slide.tsx`
- Modify: `components/wrapped-client.tsx`

**Interfaces:**
- Consumes: `artistHref`, `trackHref` from `@/lib/urls`.
- `components/wrapped-slide.tsx`'s `WrappedSlideProps.stat` type changes from `string` to `React.ReactNode` — this is a prerequisite for `wrapped-client.tsx`'s step below.

- [ ] **Step 1: `components/hidden-gems.tsx`**

Current code:
```tsx
            {gems.map((g) => (
              <li key={`${g.artist}-${g.track}`} className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{g.track}</span>
                <span className="text-xs text-muted-foreground">{g.artist}</span>
                <span className="text-xs text-muted-foreground">
                  You: {formatPlays(g.userPlays)} plays · World: {formatPlays(g.globalPlays)} plays
                </span>
              </li>
            ))}
```
Replace with:
```tsx
            {gems.map((g) => (
              <li key={`${g.artist}-${g.track}`} className="flex flex-col gap-0.5">
                <Link
                  href={trackHref(g.artist, g.track, username)}
                  className="text-sm font-medium hover:underline hover:text-primary transition-colors"
                >
                  {g.track}
                </Link>
                <Link
                  href={artistHref(g.artist, username)}
                  className="text-xs text-muted-foreground hover:underline hover:text-primary transition-colors"
                >
                  {g.artist}
                </Link>
                <span className="text-xs text-muted-foreground">
                  You: {formatPlays(g.userPlays)} plays · World: {formatPlays(g.globalPlays)} plays
                </span>
              </li>
            ))}
```
Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`.

- [ ] **Step 2: `components/underrated-tracks.tsx`**

Note: the track-name field on this file's item type is `t.name`, not `t.track`.

Current code:
```tsx
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium truncate">{t.name}</span>
                  <span className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                    {t.artist}
                  </span>
                </div>
```
Replace with:
```tsx
                <div className="flex flex-col gap-0.5 min-w-0">
                  <Link
                    href={trackHref(t.artist, t.name, username)}
                    className="text-sm font-medium truncate hover:underline hover:text-primary transition-colors"
                  >
                    {t.name}
                  </Link>
                  <Link
                    href={artistHref(t.artist, username)}
                    className="text-xs truncate hover:underline hover:text-primary transition-colors"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {t.artist}
                  </Link>
                </div>
```
Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`.

- [ ] **Step 3: `components/infinite-track-list.tsx`**

Current code:
```tsx
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--foreground)' }}>
                      {t.track}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                      {t.artist}
                      {t.album ? ` · ${t.album}` : ''}
                    </p>
                  </div>
```
Replace with:
```tsx
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--foreground)' }}>
                      <Link
                        href={trackHref(t.artist, t.track, username)}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {t.track}
                      </Link>
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                      <Link
                        href={artistHref(t.artist, username)}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {t.artist}
                      </Link>
                      {t.album ? ` · ${t.album}` : ''}
                    </p>
                  </div>
```
Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`.

- [ ] **Step 4: `components/stats-chart.tsx`**

Only the `Sheet` (day-detail panel) list and its `topArtist()` summary line are in scope — the Recharts bar chart/tooltip in the rest of this file is untouched.

Current code:
```tsx
            <div className="mt-4 space-y-1">
              <p className="text-xs text-muted-foreground mb-3">
                {dayTracks.length} scrobbles · Top artist: {topArtist(dayTracks)}
              </p>
              {dayTracks.map((t, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.track}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.artist}{t.album ? ` · ${t.album}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
                    {new Date(t.scrobbledAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
```
Replace with:
```tsx
            <div className="mt-4 space-y-1">
              <p className="text-xs text-muted-foreground mb-3">
                {dayTracks.length} scrobbles · Top artist:{' '}
                {(() => {
                  const name = topArtist(dayTracks)
                  return name === '—' ? (
                    name
                  ) : (
                    <Link
                      href={artistHref(name, username)}
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {name}
                    </Link>
                  )
                })()}
              </p>
              {dayTracks.map((t, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      <Link
                        href={trackHref(t.artist, t.track, username)}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {t.track}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      <Link
                        href={artistHref(t.artist, username)}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {t.artist}
                      </Link>
                      {t.album ? ` · ${t.album}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
                    {new Date(t.scrobbledAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
```
Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`. The local helper `topArtist(tracks: DayTrack[]): string` returns `'—'` when `dayTracks` is empty — the guard above avoids linking that placeholder.

- [ ] **Step 5: `components/repeat-plays.tsx`**

Current code:
```tsx
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.track}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                </div>
```
Replace with:
```tsx
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    <Link
                      href={trackHref(t.artist, t.track, username)}
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {t.track}
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    <Link
                      href={artistHref(t.artist, username)}
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {t.artist}
                    </Link>
                  </p>
                </div>
```
Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`.

- [ ] **Step 6: `components/wrapped-year-summary.tsx`**

This file already imports `Link` from `next/link` — only add `import { artistHref, trackHref } from '@/lib/urls'`.

Current code (StatCard "Top Artist"):
```tsx
        <StatCard
          icon={<Mic2 className="w-5 h-5" />}
          label="Top Artist"
          value={topArtist?.name ?? '—'}
          sub={topArtist ? `${topArtist.playcount.toLocaleString()} plays` : undefined}
          accent="oklch(0.15 0.2 160)"
        />
```
Replace with:
```tsx
        <StatCard
          icon={<Mic2 className="w-5 h-5" />}
          label="Top Artist"
          value={
            topArtist ? (
              <Link
                href={artistHref(topArtist.name, username)}
                className="hover:underline hover:text-primary transition-colors"
              >
                {topArtist.name}
              </Link>
            ) : (
              '—'
            )
          }
          sub={topArtist ? `${topArtist.playcount.toLocaleString()} plays` : undefined}
          accent="oklch(0.15 0.2 160)"
        />
```
(`StatCardProps.value` is already typed `React.ReactNode`, so no companion type change is needed here.)

Current code (StatCard "Anthem"):
```tsx
        <StatCard
          icon={<Music2 className="w-5 h-5" />}
          label="Anthem"
          value={topTrack?.name ?? '—'}
          sub={topTrack ? `by ${topTrack.artist} · ${topTrack.playcount.toLocaleString()} plays` : undefined}
          accent="oklch(0.15 0.2 340)"
        />
```
Replace with:
```tsx
        <StatCard
          icon={<Music2 className="w-5 h-5" />}
          label="Anthem"
          value={
            topTrack ? (
              <Link
                href={trackHref(topTrack.artist, topTrack.name, username)}
                className="hover:underline hover:text-primary transition-colors"
              >
                {topTrack.name}
              </Link>
            ) : (
              '—'
            )
          }
          sub={topTrack ? `by ${topTrack.artist} · ${topTrack.playcount.toLocaleString()} plays` : undefined}
          accent="oklch(0.15 0.2 340)"
        />
```

Current code (slideshow `slides` array, "Top Artist" entry):
```tsx
    {
      bg: 'oklch(0.15 0.2 160)',
      icon: <Mic2 className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: 'Top Artist',
      stat: topArtist?.name ?? '—',
      sub: topArtist ? `${topArtist.playcount.toLocaleString()} plays` : 'No data',
    },
```
Replace with:
```tsx
    {
      bg: 'oklch(0.15 0.2 160)',
      icon: <Mic2 className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: 'Top Artist',
      stat: topArtist ? (
        <Link
          href={artistHref(topArtist.name, username)}
          className="hover:underline hover:text-primary transition-colors"
        >
          {topArtist.name}
        </Link>
      ) : (
        '—'
      ),
      sub: topArtist ? `${topArtist.playcount.toLocaleString()} plays` : 'No data',
    },
```

Current code (slideshow `slides` array, "Anthem" entry):
```tsx
    {
      bg: 'oklch(0.15 0.2 340)',
      icon: <Music2 className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: 'Anthem',
      stat: topTrack?.name ?? '—',
      sub: topTrack ? `by ${topTrack.artist}` : 'No data',
    },
```
Replace with:
```tsx
    {
      bg: 'oklch(0.15 0.2 340)',
      icon: <Music2 className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.9)' }} />,
      label: 'Anthem',
      stat: topTrack ? (
        <Link
          href={trackHref(topTrack.artist, topTrack.name, username)}
          className="hover:underline hover:text-primary transition-colors"
        >
          {topTrack.name}
        </Link>
      ) : (
        '—'
      ),
      sub: topTrack ? `by ${topTrack.artist}` : 'No data',
    },
```

- [ ] **Step 7: `components/wrapped-slide.tsx`**

Current code (confirmed at line 11):
```tsx
  stat: string
```
Replace with:
```tsx
  stat: React.ReactNode
```
This is the `WrappedSlideProps` interface's `stat` field — no other change is needed in this file, since `{stat}` is already rendered directly as JSX children (which accepts `ReactNode`).

- [ ] **Step 8: `components/wrapped-client.tsx`**

Current code:
```tsx
    {
      title: 'Top Artist',
      stat: topArtist?.name ?? '—',
      subtitle: topArtist ? `${topArtist.playcount.toLocaleString()} plays` : 'No data',
    },
    {
      title: 'Anthem',
      stat: topTrack?.name ?? '—',
      subtitle: topTrack ? `by ${topTrack.artist}` : 'No data',
    },
```
Replace with:
```tsx
    {
      title: 'Top Artist',
      stat: topArtist ? (
        <Link
          href={artistHref(topArtist.name, username)}
          className="hover:underline hover:text-primary transition-colors"
        >
          {topArtist.name}
        </Link>
      ) : (
        '—'
      ),
      subtitle: topArtist ? `${topArtist.playcount.toLocaleString()} plays` : 'No data',
    },
    {
      title: 'Anthem',
      stat: topTrack ? (
        <Link
          href={trackHref(topTrack.artist, topTrack.name, username)}
          className="hover:underline hover:text-primary transition-colors"
        >
          {topTrack.name}
        </Link>
      ) : (
        '—'
      ),
      subtitle: topTrack ? `by ${topTrack.artist}` : 'No data',
    },
```
Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`.

- [ ] **Step 9: Run the type checker and test suite**

Run: `npx tsc --noEmit`
Expected: no new errors (Step 7's type change must land before Step 8 will type-check).

Run: `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next`
Expected: no new failures beyond any already-known pre-existing ones.

- [ ] **Step 10: Commit**

```bash
git add components/hidden-gems.tsx components/underrated-tracks.tsx components/infinite-track-list.tsx components/stats-chart.tsx components/repeat-plays.tsx components/wrapped-year-summary.tsx components/wrapped-slide.tsx components/wrapped-client.tsx
git commit -m "feat: make artist/track names clickable in track-list and wrapped widgets"
```

---

### Task 9: Artist+track widgets needing a new `username` prop

**Files:**
- Modify: `components/monthly-top-track.tsx`
- Modify: `components/listening-report.tsx`
- Modify: `components/streak-calendar.tsx`
- Modify: `components/loved-tracks.tsx`
- Modify: `components/loved-tracks-timeline.tsx`
- Modify: `components/profile-search.tsx`
- Modify: `components/user-profile.tsx` (4 call sites: monthly-top-track, listening-report, streak-calendar, loved-tracks + loved-tracks-timeline)

**Interfaces:**
- Consumes: `artistHref`, `trackHref` from `@/lib/urls`.

- [ ] **Step 1: `components/monthly-top-track.tsx`**

Current code:
```tsx
export function MonthlyTopTrack({ scrobbles }: { scrobbles: Scrobble[] }) {
```
```tsx
                  <p className="text-sm font-medium leading-tight truncate" title={entry.track}>
                    {entry.track}
                  </p>
                  <p className="text-xs text-muted-foreground truncate" title={entry.artist}>
                    {entry.artist}
                  </p>
```
Replace with:
```tsx
export function MonthlyTopTrack({ scrobbles, username }: { scrobbles: Scrobble[]; username: string }) {
```
```tsx
                  <p className="text-sm font-medium leading-tight truncate" title={entry.track}>
                    <Link href={trackHref(entry.artist, entry.track, username)} className="hover:underline text-foreground">
                      {entry.track}
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground truncate" title={entry.artist}>
                    <Link href={artistHref(entry.artist, username)} className="hover:underline hover:text-foreground transition-colors">
                      {entry.artist}
                    </Link>
                  </p>
```
Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`.

- [ ] **Step 2: `components/listening-report.tsx`**

`report.topTrack` is currently a single combined string (`"${artist} — ${track}"`, used only as a dedup key), so artist and track can't be safely split back out of it (names may themselves contain " — "). This requires restructuring `computeReport` to keep them separate. `computeReport` is confirmed local to this file (no other file imports it).

Current code (track-counting loop):
```tsx
  const trackCountsCurrent: Record<string, number> = {}
  for (const s of currentScrobbles) {
    const key = `${s.artist} — ${s.track}`
    trackCountsCurrent[key] = (trackCountsCurrent[key] ?? 0) + 1
  }
  const topTrackEntry = Object.entries(trackCountsCurrent).sort((a, b) => b[1] - a[1])[0]
  const topTrack = topTrackEntry?.[0] ?? '—'
```
Replace with:
```tsx
  const trackCountsCurrent: Record<string, number> = {}
  for (const s of currentScrobbles) {
    const key = `${s.artist} ${s.track}`
    trackCountsCurrent[key] = (trackCountsCurrent[key] ?? 0) + 1
  }
  const topTrackEntry = Object.entries(trackCountsCurrent).sort((a, b) => b[1] - a[1])[0]
  const [topTrackArtist, topTrackName] = topTrackEntry ? topTrackEntry[0].split(' ') : ['', '—']
```

Find `computeReport`'s return object and replace the `topTrack` field with the two new fields (keep every other field exactly as it is today):
```tsx
    topTrack,
```
Replace with:
```tsx
    topTrackArtist,
    topTrackName,
```

Current code (props interface):
```tsx
interface ListeningReportProps {
  scrobbles: Scrobble[]
  period?: '7day' | '30day'
}
```
Replace with:
```tsx
interface ListeningReportProps {
  scrobbles: Scrobble[]
  period?: '7day' | '30day'
  username: string
}
```

Current code (component signature):
```tsx
export function ListeningReport({ scrobbles, period = '7day' }: ListeningReportProps) {
```
Replace with:
```tsx
export function ListeningReport({ scrobbles, period = '7day', username }: ListeningReportProps) {
```

Current code (rendering):
```tsx
          <div className="rounded-md border bg-muted/30 px-3 py-2 col-span-2">
            <p className="text-xs text-muted-foreground">Top artist</p>
            <p className="font-medium text-sm leading-tight mt-0.5 truncate">{report.topArtist}</p>
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 col-span-2">
            <p className="text-xs text-muted-foreground">Top track</p>
            <p className="font-medium text-sm leading-tight mt-0.5 truncate">{report.topTrack}</p>
          </div>
```
Replace with:
```tsx
          <div className="rounded-md border bg-muted/30 px-3 py-2 col-span-2">
            <p className="text-xs text-muted-foreground">Top artist</p>
            {report.topArtist === '—' ? (
              <p className="font-medium text-sm leading-tight mt-0.5 truncate">{report.topArtist}</p>
            ) : (
              <Link
                href={artistHref(report.topArtist, username)}
                className="block font-medium text-sm leading-tight mt-0.5 truncate hover:underline text-foreground"
              >
                {report.topArtist}
              </Link>
            )}
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 col-span-2">
            <p className="text-xs text-muted-foreground">Top track</p>
            {report.topTrackName === '—' ? (
              <p className="font-medium text-sm leading-tight mt-0.5 truncate">{report.topTrackName}</p>
            ) : (
              <Link
                href={trackHref(report.topTrackArtist, report.topTrackName, username)}
                className="block font-medium text-sm leading-tight mt-0.5 truncate hover:underline text-foreground"
              >
                {report.topTrackName}
              </Link>
            )}
          </div>
```
Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`.

- [ ] **Step 3: `components/streak-calendar.tsx`**

Current code:
```tsx
interface Props {
  scrobbles: { scrobbledAt: Date; artist: string; track: string }[]
}
```
```tsx
export function StreakCalendar({ scrobbles }: Props) {
```
```tsx
                  <span style={{ color: 'var(--foreground)', fontWeight: 500, flexShrink: 0, maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.track}
                  </span>
                  <span style={{ color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.artist}
                  </span>
```
Replace with:
```tsx
interface Props {
  scrobbles: { scrobbledAt: Date; artist: string; track: string }[]
  username: string
}
```
```tsx
export function StreakCalendar({ scrobbles, username }: Props) {
```
```tsx
                  <Link
                    href={trackHref(t.artist, t.track, username)}
                    className="hover:underline"
                    style={{ color: 'var(--foreground)', fontWeight: 500, flexShrink: 0, maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {t.track}
                  </Link>
                  <Link
                    href={artistHref(t.artist, username)}
                    className="hover:underline"
                    style={{ color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {t.artist}
                  </Link>
```
Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`.

- [ ] **Step 4: `components/loved-tracks.tsx`**

Current code:
```tsx
export function LovedTracks({ tracks }: { tracks: LovedTrack[] }) {
```
```tsx
            {tracks.map((t) => (
              <li key={`${t.artist}::${t.track}`} className="flex flex-col rounded-md border p-3">
                <span className="font-medium truncate">{t.track}</span>
                <span className="text-sm text-muted-foreground truncate">{t.artist}</span>
              </li>
            ))}
```
Replace with:
```tsx
export function LovedTracks({ tracks, username }: { tracks: LovedTrack[]; username: string }) {
```
```tsx
            {tracks.map((t) => (
              <li key={`${t.artist}::${t.track}`} className="flex flex-col rounded-md border p-3">
                <Link href={trackHref(t.artist, t.track, username)} className="font-medium truncate hover:underline text-foreground">
                  {t.track}
                </Link>
                <Link href={artistHref(t.artist, username)} className="text-sm text-muted-foreground truncate hover:underline hover:text-foreground transition-colors">
                  {t.artist}
                </Link>
              </li>
            ))}
```
Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`.

- [ ] **Step 5: `components/loved-tracks-timeline.tsx`**

Current code:
```tsx
export function LovedTracksTimeline({
  lovedTracks,
}: {
  lovedTracks: LovedTrack[]
}) {
```
```tsx
                    {visible.map((t, i) => (
                      <li
                        key={`${month.key}-${i}`}
                        className="text-sm text-muted-foreground"
                      >
                        <span className="font-medium text-foreground">{t.track}</span>
                        {' — '}
                        {t.artist}
                      </li>
                    ))}
```
Replace with:
```tsx
export function LovedTracksTimeline({
  lovedTracks,
  username,
}: {
  lovedTracks: LovedTrack[]
  username: string
}) {
```
```tsx
                    {visible.map((t, i) => (
                      <li
                        key={`${month.key}-${i}`}
                        className="text-sm text-muted-foreground"
                      >
                        <Link href={trackHref(t.artist, t.track, username)} className="font-medium text-foreground hover:underline">
                          {t.track}
                        </Link>
                        {' — '}
                        <Link href={artistHref(t.artist, username)} className="hover:underline hover:text-foreground transition-colors">
                          {t.artist}
                        </Link>
                      </li>
                    ))}
```
Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`.

- [ ] **Step 6: `components/profile-search.tsx`**

This component is currently unmounted (no import/render site found anywhere in `app/` or `components/`), so this step only brings it up to the same standard as every other widget — it does not add a new mount point (out of scope for this plan).

Current code:
```tsx
interface ProfileSearchProps {
  topArtists: TopArtist[]
  topTracks: TopTrack[]
}

export function ProfileSearch({ topArtists, topTracks }: ProfileSearchProps) {
```
Replace with:
```tsx
interface ProfileSearchProps {
  topArtists: TopArtist[]
  topTracks: TopTrack[]
  username: string
}

export function ProfileSearch({ topArtists, topTracks, username }: ProfileSearchProps) {
```

Current code (artists section):
```tsx
                {filteredArtists.map((a) => (
                  <li
                    key={a.name}
                    className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50 transition-colors cursor-default"
                  >
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                      {a.name}
                    </span>
                    <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                      {a.playcount.toLocaleString()} plays
                    </span>
                  </li>
                ))}
```
Replace with:
```tsx
                {filteredArtists.map((a) => (
                  <li key={a.name}>
                    <Link
                      href={artistHref(a.name, username)}
                      className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                        {a.name}
                      </span>
                      <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                        {a.playcount.toLocaleString()} plays
                      </span>
                    </Link>
                  </li>
                ))}
```

Current code (tracks section):
```tsx
                {filteredTracks.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50 transition-colors cursor-default"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                        {t.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                        {t.artist}
                      </p>
                    </div>
                    <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                      {t.playcount.toLocaleString()} plays
                    </span>
                  </li>
                ))}
```
Replace with:
```tsx
                {filteredTracks.map((t, i) => (
                  <li key={i}>
                    <Link
                      href={trackHref(t.artist, t.name, username)}
                      className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                          {t.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>
                          {t.artist}
                        </p>
                      </div>
                      <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
                        {t.playcount.toLocaleString()} plays
                      </span>
                    </Link>
                  </li>
                ))}
```
Add imports: `import Link from 'next/link'` and `import { artistHref, trackHref } from '@/lib/urls'`.

- [ ] **Step 7: Thread `username` at the remaining call sites in `components/user-profile.tsx`**

Current code:
```tsx
case 'monthly-top-track':
  return <MonthlyTopTrack scrobbles={allScrobbles} />
```
Replace with:
```tsx
case 'monthly-top-track':
  return <MonthlyTopTrack scrobbles={allScrobbles} username={username} />
```

Current code:
```tsx
case 'listening-report':
  return <ListeningReport scrobbles={allScrobbles} />
```
Replace with:
```tsx
case 'listening-report':
  return <ListeningReport scrobbles={allScrobbles} username={username} />
```

Current code:
```tsx
case 'streak-calendar':
  return <StreakCalendar scrobbles={allScrobbles} />
```
Replace with:
```tsx
case 'streak-calendar':
  return <StreakCalendar scrobbles={allScrobbles} username={username} />
```

Current code:
```tsx
<LovedTracks tracks={lovedTracks} />
```
Replace with:
```tsx
<LovedTracks tracks={lovedTracks} username={username} />
```

Current code:
```tsx
<LovedTracksTimeline lovedTracks={lovedTracks} />
```
Replace with:
```tsx
<LovedTracksTimeline lovedTracks={lovedTracks} username={username} />
```

(`ProfileSearch` from Step 6 has no existing call site — no threading needed there; it stays unmounted as it is today.)

- [ ] **Step 8: Run the type checker and test suite**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next`
Expected: no new failures beyond any already-known pre-existing ones.

- [ ] **Step 9: Commit**

```bash
git add components/monthly-top-track.tsx components/listening-report.tsx components/streak-calendar.tsx components/loved-tracks.tsx components/loved-tracks-timeline.tsx components/profile-search.tsx components/user-profile.tsx
git commit -m "feat: make artist/track names clickable across remaining track-list widgets"
```

---

### Task 10: Artist+album widgets, and the playlist-builder special case

**Files:**
- Modify: `components/yearly-top-album.tsx`
- Modify: `components/album-completion.tsx`
- Modify: `components/new-releases.tsx`
- Modify: `components/playlist-builder.tsx`
- Modify: `components/user-profile.tsx` (1 call site: yearly-top-album)

**Interfaces:**
- Consumes: `artistHref`, `albumHref` from `@/lib/urls`.

- [ ] **Step 1: `components/yearly-top-album.tsx`**

Current code:
```tsx
export function YearlyTopAlbum({ scrobbles }: { scrobbles: Scrobble[] }) {
```
```tsx
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: '1.3',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                  title={album}
                >
                  {album}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    opacity: 0.75,
                    marginBottom: '6px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                  title={artist}
                >
                  {artist}
                </div>
```
Replace with:
```tsx
export function YearlyTopAlbum({ scrobbles, username }: { scrobbles: Scrobble[]; username: string }) {
```
```tsx
                <Link
                  href={albumHref(artist, album, username)}
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: '1.3',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    color: 'inherit',
                    textDecoration: 'none',
                  }}
                  title={album}
                >
                  {album}
                </Link>
                <Link
                  href={artistHref(artist, username)}
                  style={{
                    fontSize: '11px',
                    opacity: 0.75,
                    marginBottom: '6px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    display: 'block',
                    color: 'inherit',
                    textDecoration: 'none',
                  }}
                  title={artist}
                >
                  {artist}
                </Link>
```
Add imports: `import Link from 'next/link'` and `import { albumHref, artistHref } from '@/lib/urls'`. (`display: 'block'` and `color: 'inherit'; textDecoration: 'none'` are added because `<Link>`/`<a>` render inline with browser default link styling by default, unlike the plain `<div>`s being replaced — this preserves the existing visual layout.)

Note: the call site (Step 5 below) currently maps every scrobble's `album` to `null` before passing it in, which combined with this component's existing `if (!s.album) continue` guard means the widget renders no entries today regardless of this change — this is a pre-existing, unrelated bug. Do not fix it as part of this task; only thread `username` through.

- [ ] **Step 2: `components/album-completion.tsx`**

Current code:
```tsx
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{a.album}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.artist}</p>
                  </div>
```
Replace with:
```tsx
                  <div className="min-w-0 flex-1">
                    <Link
                      href={albumHref(a.artist, a.album, username)}
                      className="text-sm font-medium truncate block hover:underline"
                    >
                      {a.album}
                    </Link>
                    <Link
                      href={artistHref(a.artist, username)}
                      className="text-xs text-muted-foreground truncate block hover:underline"
                    >
                      {a.artist}
                    </Link>
                  </div>
```
Add imports: `import Link from 'next/link'` and `import { albumHref, artistHref } from '@/lib/urls'`. (`username` prop already exists on this component — no signature change needed.)

- [ ] **Step 3: `components/new-releases.tsx`**

Current code:
```tsx
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium leading-tight line-clamp-2">{r.album}</span>
                  <span className="text-xs text-muted-foreground truncate">{r.artist}</span>
                </div>
```
Replace with:
```tsx
                <div className="flex flex-col gap-0.5">
                  <Link
                    href={albumHref(r.artist, r.album, username)}
                    className="text-sm font-medium leading-tight line-clamp-2 hover:underline"
                  >
                    {r.album}
                  </Link>
                  <Link
                    href={artistHref(r.artist, username)}
                    className="text-xs text-muted-foreground truncate hover:underline"
                  >
                    {r.artist}
                  </Link>
                </div>
```
Add imports: `import Link from 'next/link'` and `import { albumHref, artistHref } from '@/lib/urls'`. (`username` prop already exists — no signature change needed.)

- [ ] **Step 4: `components/playlist-builder.tsx`**

This is a track-selection tool: each row is currently a native `<label>` wrapping a hidden checkbox `<input>`, so clicking anywhere in the row toggles the checkbox via native label/input association. Nesting a `<Link>` (an `<a>`) inside that `<label>` would make clicking the artist name both navigate and risk also toggling the checkbox — fragile across browsers. This step replaces the `<label>` with an explicit `<div role="checkbox">` that has its own `onClick` handling, and makes the artist link stop propagation so it navigates without toggling the row.

Current code:
```tsx
                filteredIndices.map((idx) => {
                  const t = tracks[idx]
                  const checked = checkedTracks.has(idx)
                  return (
                    <label
                      key={idx}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTrack(idx)}
                        className="accent-primary w-4 h-4 shrink-0"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="font-medium text-sm block truncate">{t.name}</span>
                        <span className="text-xs text-muted-foreground block truncate">{t.artist}</span>
                      </span>
                    </label>
                  )
                })
```
Replace with:
```tsx
                filteredIndices.map((idx) => {
                  const t = tracks[idx]
                  const checked = checkedTracks.has(idx)
                  return (
                    <div
                      key={idx}
                      role="checkbox"
                      aria-checked={checked}
                      tabIndex={0}
                      onClick={() => toggleTrack(idx)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault()
                          toggleTrack(idx)
                        }
                      }}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTrack(idx)}
                        className="accent-primary w-4 h-4 shrink-0 pointer-events-none"
                        tabIndex={-1}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="font-medium text-sm block truncate">{t.name}</span>
                        <Link
                          href={artistHref(t.artist, username)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-muted-foreground block truncate hover:underline hover:text-foreground w-fit"
                        >
                          {t.artist}
                        </Link>
                      </span>
                    </div>
                  )
                })
```
Add imports: `import Link from 'next/link'` and `import { artistHref } from '@/lib/urls'`. Only the artist name becomes a link here (there's no album field carried through this component's normalized `TrackEntry` shape, and no track-detail link either, to keep this step's scope to the specific risky interaction called out — the row's own click still opens/closes the checkbox exactly as before). The `input`'s `pointer-events-none` and `tabIndex={-1}` hand sole responsibility for toggling to the row's own `onClick`/`onKeyDown`, and `role="checkbox"`/`aria-checked`/`tabIndex={0}` restore the keyboard/screen-reader semantics the native `<label>+<input>` combo provided for free.

- [ ] **Step 5: Thread `username` at the `yearly-top-album` call site in `components/user-profile.tsx`**

Current code:
```tsx
      case 'yearly-top-album':
        return (
          <YearlyTopAlbum
            scrobbles={allScrobbles.map((s) => ({ ...s, album: null }))}
          />
        )
```
Replace with:
```tsx
      case 'yearly-top-album':
        return (
          <YearlyTopAlbum
            scrobbles={allScrobbles.map((s) => ({ ...s, album: null }))}
            username={username}
          />
        )
```

- [ ] **Step 6: Run the type checker and test suite**

Run: `npx tsc --noEmit`
Expected: no new errors.

Run: `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next`
Expected: no new failures beyond any already-known pre-existing ones.

- [ ] **Step 7: Commit**

```bash
git add components/yearly-top-album.tsx components/album-completion.tsx components/new-releases.tsx components/playlist-builder.tsx components/user-profile.tsx
git commit -m "feat: make album/artist names clickable in album widgets and playlist builder"
```

---

### Task 11: Verification

**Files:** none (verification only)

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next`
Expected: no new failures beyond any already-known pre-existing ones.

- [ ] **Step 3: Build**

Run: `npx next build`
Expected: succeeds across all routes.

- [ ] **Step 4: Manual spot check**

With the dev server running on port 4000 (`npm run dev`), open a user profile and click through at least one widget from each of: an artist-only list, an artist+track list, an artist+album list, the Now Playing banner (if something is currently scrobbling), the Artist Network graph, and the Activity Feed. Confirm each click navigates to the right detail page and that the destination page shows personalized stats (i.e. the `?username=` query param round-tripped correctly). Also open the two-user compare page and confirm artist links there navigate correctly using `user1`'s context.
