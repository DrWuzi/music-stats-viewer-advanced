# Profile Custom Loading Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a profile owner pick a loading animation (accent-tinted, CSS/SVG-only) that every visitor sees while `/user/<username>`'s main dashboard data streams in, persisted to the DB and editable via the existing live profile editor.

**Architecture:** A fifth `User.loadingAnimation` field joins the existing `profileTheme`/`profileTagline`/`avatarDecoration`/`profileBackground` customization system. A single new file (`components/profile-loading-animations.tsx`) holds the preset catalog, validator, and renderers — mirroring `components/avatar-decorations.tsx`'s structure. `app/user/[username]/page.tsx` is split into a thin outer wrapper (existence-check + cheap preset lookup, still fully blocking so `notFound()` keeps producing a real 404 status) and an inner `ProfilePageContent` async component wrapped in an explicit `<Suspense fallback={<ProfileLoadingAnimation preset={preset} />}>` — this scopes the fallback to exactly this route (not sibling routes like `achievements/`) and lets the preset be looked up per-username, which Next's file-based `loading.tsx` convention cannot do since it receives no route params.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + Postgres, Tailwind v4, Vitest + Testing Library, TypeScript.

## Global Constraints

- Reference spec: `docs/superpowers/specs/2026-07-08-profile-loading-animation-design.md` — read it before starting if anything below is unclear.
- 4 preset keys exactly: `none | vinyl | equalizer | soundwave`. `none` is the default — `ProfileLoadingAnimation` returns `null`, zero behavior change for existing users.
- Presets render via `currentColor` set to `var(--profile-accent, var(--primary))` — same convention as `avatar-decorations.tsx`/`profile-backgrounds.tsx`, never a separate color picker.
- No uploads, no artificial minimum-duration/splash timer — this is a pure Suspense fallback, visible for exactly as long as `ProfilePageContent`'s own data fetching takes.
- The Suspense boundary must wrap **only** `app/user/[username]/page.tsx`'s own content, not `layout.tsx` (banner data fetching stays synchronous) and not sibling routes (`achievements/page.tsx`, `history/page.tsx`, etc. — separate files, untouched).
- **Correctness constraint:** any code path that can call `notFound()` must run *before* the Suspense boundary is entered. Per `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`, Next.js cannot change the HTTP status code once the response body has started streaming (which happens as soon as a Suspense fallback renders) — so the existence-check/sync logic stays in the outer, blocking part of `page.tsx`, and only the expensive stats/chart queries move into the Suspense-wrapped `ProfilePageContent`.
- Animated presets must stop under `prefers-reduced-motion: reduce`.
- Windows dev server runs on port 4000 (`npm run dev`) — ports 3000/3001 are Windows-reserved on this machine and will fail with `EACCES`.
- Run `npx tsc --noEmit` after every task; only pre-existing failures in `tests/placeholder.test.ts` are acceptable, nothing else.
- Run tests with `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next` — this repo has stale leftover git worktrees under `.claude/worktrees/` from an earlier session that vitest's default include glob would otherwise pick up.

---

### Task 1: Prisma schema field + migration + test mock updates

**Files:**
- Modify: `prisma/schema.prisma` (add one field to the `User` model)
- Modify: `tests/api/sync.test.ts:34-39, 53-56, 59-62` (3 mock `User` objects)
- Modify: `tests/lib/sync.test.ts:39-45` (1 mock `User` object)

**Interfaces:**
- Produces: `User.loadingAnimation: string | null` — every later task that touches a `User` record (Prisma queries, mocks) must include this field.

- [ ] **Step 1: Add the field to the schema**

In `prisma/schema.prisma`, find:

```prisma
  profileTheme      String?
  profileTagline    String?
  avatarDecoration  String?
  profileBackground String?
```

Change to:

```prisma
  profileTheme      String?
  profileTagline    String?
  avatarDecoration  String?
  profileBackground String?
  loadingAnimation  String?
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name add_loading_animation`

Expected output ends with:
```
Your database is now in sync with your schema.
```

- [ ] **Step 3: Regenerate the Prisma client and clear the Next.js cache**

Run:
```bash
npx prisma generate
rm -rf .next
```

Expected: `✔ Generated Prisma Client (7.8.0) to .\lib\generated\prisma`

(This project has a documented history of stale-Prisma-client "Unknown argument" errors if `.next` isn't cleared after a schema change — do not skip this step.)

- [ ] **Step 4: Update `tests/api/sync.test.ts` mocks**

There are 3 mock `User` objects, each ending in `..., avatarDecoration: null, profileBackground: null,`. Add `loadingAnimation: null,` immediately after `profileBackground: null,` in all 3.

First occurrence (lines ~34-39):
```typescript
      dashboardOrder: null,
      dashboardHidden: null,
      profileTheme: null,
      profileTagline: null,
      avatarDecoration: null,
      profileBackground: null,
      loadingAnimation: null,
    })
```

Second and third occurrences (lines ~53-56 and ~59-62) are single-line forms — find:
```typescript
      profileTheme: null, profileTagline: null, avatarDecoration: null, profileBackground: null,
```
Change (both occurrences) to:
```typescript
      profileTheme: null, profileTagline: null, avatarDecoration: null, profileBackground: null,
      loadingAnimation: null,
```

- [ ] **Step 5: Update `tests/lib/sync.test.ts` mock**

Find (lines ~39-45):
```typescript
      profileTheme: null,
      profileTagline: null,
      avatarDecoration: null,
      profileBackground: null,
    })
```

Change to:
```typescript
      profileTheme: null,
      profileTagline: null,
      avatarDecoration: null,
      profileBackground: null,
      loadingAnimation: null,
    })
```

- [ ] **Step 6: Verify types and tests**

Run: `npx tsc --noEmit`
Expected: no output (only pre-existing `tests/placeholder.test.ts` errors are acceptable — zero Prisma/schema-related errors)

Run: `npx vitest run tests/api/sync.test.ts tests/lib/sync.test.ts`
Expected: `Test Files  2 passed`, `Tests  5 passed`

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations tests/api/sync.test.ts tests/lib/sync.test.ts
git commit -m "feat: add loadingAnimation field to User model"
```

---

### Task 2: `components/profile-loading-animations.tsx` — catalog, validator, renderers

**Files:**
- Create: `components/profile-loading-animations.tsx`
- Create: `tests/components/profile-loading-animations.test.tsx`
- Modify: `app/globals.css` (new keyframes, animation classes, reduced-motion guard)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (used by Task 3, Task 4, Task 5):
  - `export type LoadingAnimationKey = 'none' | 'vinyl' | 'equalizer' | 'soundwave'`
  - `export const LOADING_ANIMATION_KEYS: LoadingAnimationKey[]`
  - `export const LOADING_ANIMATION_LABELS: Record<LoadingAnimationKey, string>`
  - `export function isValidLoadingAnimation(value: unknown): value is LoadingAnimationKey`
  - `export function ProfileLoadingAnimation({ preset }: { preset: LoadingAnimationKey }): JSX.Element | null` — renders `null` for `'none'`, otherwise a `role="status"` fallback block with className `profile-loading-layer`.
  - `export function ProfileLoadingAnimationPreview({ preset }: { preset: LoadingAnimationKey }): JSX.Element` — small static swatch for the picker UI, never `null`.

- [ ] **Step 1: Write the failing tests**

Create `tests/components/profile-loading-animations.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  ProfileLoadingAnimation,
  ProfileLoadingAnimationPreview,
  LOADING_ANIMATION_KEYS,
  isValidLoadingAnimation,
  type LoadingAnimationKey,
} from '@/components/profile-loading-animations'

describe('isValidLoadingAnimation', () => {
  it('accepts every known key', () => {
    for (const key of LOADING_ANIMATION_KEYS) {
      expect(isValidLoadingAnimation(key)).toBe(true)
    }
  })

  it('rejects unknown values', () => {
    expect(isValidLoadingAnimation('not-a-real-preset')).toBe(false)
    expect(isValidLoadingAnimation(null)).toBe(false)
    expect(isValidLoadingAnimation(undefined)).toBe(false)
    expect(isValidLoadingAnimation(42)).toBe(false)
  })
})

describe('ProfileLoadingAnimation', () => {
  it('renders nothing for "none"', () => {
    const { container } = render(<ProfileLoadingAnimation preset="none" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a status region for every non-none preset', () => {
    const presets = LOADING_ANIMATION_KEYS.filter(
      (k): k is Exclude<LoadingAnimationKey, 'none'> => k !== 'none',
    )
    for (const preset of presets) {
      const { container } = render(<ProfileLoadingAnimation preset={preset} />)
      expect(container.querySelector('[role="status"]')).not.toBeNull()
    }
  })
})

describe('ProfileLoadingAnimationPreview', () => {
  it('renders something for every preset including none', () => {
    for (const preset of LOADING_ANIMATION_KEYS) {
      const { container } = render(<ProfileLoadingAnimationPreview preset={preset} />)
      expect(container.firstChild).not.toBeNull()
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/profile-loading-animations.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/profile-loading-animations"`

- [ ] **Step 3: Create `components/profile-loading-animations.tsx`**

```typescript
/**
 * Profile loading-animation presets — shown as the Suspense fallback while
 * the main profile dashboard's own data (Last.fm profile info, scrobble
 * stats, chart queries) streams in. Pure CSS/SVG, no client JS, so it works
 * as a Server Component fallback during SSR streaming. Mirrors the structure
 * of components/avatar-decorations.tsx and components/profile-backgrounds.tsx
 * (types + validator + JSX renderers all in one file).
 */

import type { ReactNode } from 'react'

export type LoadingAnimationKey = 'none' | 'vinyl' | 'equalizer' | 'soundwave'

export const LOADING_ANIMATION_KEYS: LoadingAnimationKey[] = [
  'none',
  'vinyl',
  'equalizer',
  'soundwave',
]

export const LOADING_ANIMATION_LABELS: Record<LoadingAnimationKey, string> = {
  none: 'None',
  vinyl: 'Vinyl',
  equalizer: 'Equalizer',
  soundwave: 'Soundwave',
}

export function isValidLoadingAnimation(value: unknown): value is LoadingAnimationKey {
  return typeof value === 'string' && (LOADING_ANIMATION_KEYS as string[]).includes(value)
}

const ACCENT = 'var(--profile-accent, var(--primary))'

function Vinyl() {
  return (
    <svg viewBox="0 0 100 100" className="h-16 w-16" style={{ color: ACCENT }} aria-hidden>
      <g className="profile-loading-vinyl-spin" style={{ transformOrigin: '50px 50px' }}>
        <circle cx="50" cy="50" r="46" fill="var(--muted)" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <circle cx="50" cy="50" r="26" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <circle cx="50" cy="50" r="16" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <circle cx="50" cy="50" r="9" fill="currentColor" />
        <circle cx="50" cy="50" r="2.5" fill="var(--background)" />
      </g>
      {/* Tonearm — fixed in place, does not spin with the disc */}
      <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="currentColor">
        <circle cx="88" cy="14" r="5" fill="none" />
        <line x1="88" y1="14" x2="58" y2="42" />
        <circle cx="58" cy="42" r="2.5" />
      </g>
    </svg>
  )
}

function Equalizer() {
  const bars = [0, 1, 2, 3, 4]
  return (
    <div className="flex items-end gap-1.5 h-16" aria-hidden>
      {bars.map((i) => (
        <span
          key={i}
          className="profile-loading-eq-bar w-2.5 rounded-full block"
          style={{
            background: ACCENT,
            height: '100%',
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  )
}

function Soundwave() {
  return (
    <svg viewBox="0 0 100 100" className="h-16 w-16" style={{ color: ACCENT }} aria-hidden>
      <circle
        className="profile-loading-soundwave-ring"
        cx="50"
        cy="50"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        style={{ animationDelay: '0s' }}
      />
      <circle
        className="profile-loading-soundwave-ring"
        cx="50"
        cy="50"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        style={{ animationDelay: '0.6s' }}
      />
      <circle
        className="profile-loading-soundwave-ring"
        cx="50"
        cy="50"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        style={{ animationDelay: '1.2s' }}
      />
      <circle cx="50" cy="50" r="6" fill="currentColor" />
    </svg>
  )
}

function renderAnimation(preset: LoadingAnimationKey): ReactNode {
  switch (preset) {
    case 'vinyl':
      return <Vinyl />
    case 'equalizer':
      return <Equalizer />
    case 'soundwave':
      return <Soundwave />
    default:
      return null
  }
}

/** Suspense fallback shown while the main profile page's own data loads. */
export function ProfileLoadingAnimation({ preset }: { preset: LoadingAnimationKey }) {
  if (preset === 'none') return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="profile-loading-layer flex flex-col items-center justify-center gap-4 min-h-[50vh] py-16"
    >
      {renderAnimation(preset)}
      <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
        Loading profile…
      </p>
    </div>
  )
}

/** Small static preview swatch used in the picker (no fixed positioning). */
export function ProfileLoadingAnimationPreview({ preset }: { preset: LoadingAnimationKey }) {
  if (preset === 'none') {
    return (
      <div
        className="h-10 w-16 rounded-md border border-dashed flex items-center justify-center text-[0.6rem]"
        style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
      >
        None
      </div>
    )
  }
  return (
    <div
      className="h-10 w-16 rounded-md overflow-hidden border flex items-center justify-center"
      style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
    >
      <div className="scale-[0.4]">{renderAnimation(preset)}</div>
    </div>
  )
}
```

- [ ] **Step 4: Add keyframes, animation classes, and reduced-motion guard to `app/globals.css`**

Find the existing profile-background reduced-motion block:

```css
@media (prefers-reduced-motion: reduce) {
  .profile-bg-aurora-a,
  .profile-bg-aurora-b,
  .profile-bg-particles,
  .profile-bg-glow {
    animation: none !important;
  }
}

.animation-delay-0 {
  animation-delay: 0ms;
}
```

Change to (inserting the new block between the closing `}` and `.animation-delay-0`):

```css
@media (prefers-reduced-motion: reduce) {
  .profile-bg-aurora-a,
  .profile-bg-aurora-b,
  .profile-bg-particles,
  .profile-bg-glow {
    animation: none !important;
  }
}

/* Profile loading-animation presets (see components/profile-loading-animations.tsx) */
@keyframes profileLoadingVinylSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes profileLoadingEqBar {
  0%, 100% { transform: scaleY(0.35); opacity: 0.7; }
  50% { transform: scaleY(1); opacity: 1; }
}
@keyframes profileLoadingSoundwaveRing {
  0% { transform: scale(0.4); opacity: 0.8; }
  100% { transform: scale(1.8); opacity: 0; }
}

.profile-loading-vinyl-spin { animation: profileLoadingVinylSpin 3s linear infinite; }
.profile-loading-eq-bar { animation: profileLoadingEqBar 0.9s ease-in-out infinite; transform-origin: bottom; }
.profile-loading-soundwave-ring { animation: profileLoadingSoundwaveRing 2.4s ease-out infinite; transform-origin: 50% 50%; }

@media (prefers-reduced-motion: reduce) {
  .profile-loading-vinyl-spin,
  .profile-loading-eq-bar,
  .profile-loading-soundwave-ring {
    animation: none !important;
  }
}

.animation-delay-0 {
  animation-delay: 0ms;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/components/profile-loading-animations.test.tsx`
Expected: `Test Files  1 passed`, `Tests  4 passed`

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 7: Commit**

```bash
git add components/profile-loading-animations.tsx tests/components/profile-loading-animations.test.tsx app/globals.css
git commit -m "feat: add profile loading-animation preset catalog and renderers"
```

---

### Task 3: Extend the profile-customization API route

**Files:**
- Modify: `app/api/profile-customization/route.ts`
- Modify: `tests/api/profile-customization.test.ts` (add new tests alongside the existing `profileBackground` ones)

**Interfaces:**
- Consumes: `isValidLoadingAnimation` from `@/components/profile-loading-animations` (Task 2).
- Produces: `POST /api/profile-customization` accepts an optional `loadingAnimation` field in its JSON body and persists it when valid.

- [ ] **Step 1: Write the failing tests**

In `tests/api/profile-customization.test.ts`, add these three `it` blocks inside the existing `describe('POST /api/profile-customization', ...)`, after the `persists a valid profileBackground value` test:

```typescript
  it('ignores an invalid loadingAnimation value', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue({ userId: 'u1', lastfmUsername: 'user' })
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/profile-customization/route')
    const res = await POST(makeRequest({ loadingAnimation: 'not-a-real-preset' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.loadingAnimation).toBeUndefined()
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ loadingAnimation: expect.anything() }),
      }),
    )
  })

  it('persists a valid loadingAnimation value', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue({ userId: 'u1', lastfmUsername: 'user' })
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/profile-customization/route')
    const res = await POST(makeRequest({ loadingAnimation: 'vinyl' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.loadingAnimation).toBe('vinyl')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lastfmUsername: 'user' },
        data: expect.objectContaining({ loadingAnimation: 'vinyl' }),
      }),
    )
  })
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/api/profile-customization.test.ts`
Expected: the existing tests pass, but the two new `loadingAnimation` tests FAIL since the route doesn't read that field yet.

- [ ] **Step 3: Extend the route**

In `app/api/profile-customization/route.ts`, find:

```typescript
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isValidProfileTheme } from '@/lib/profile-themes'
import { isValidAvatarDecoration } from '@/components/avatar-decorations'
import { isValidProfileBackground } from '@/components/profile-backgrounds'
```

Change to:

```typescript
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isValidProfileTheme } from '@/lib/profile-themes'
import { isValidAvatarDecoration } from '@/components/avatar-decorations'
import { isValidProfileBackground } from '@/components/profile-backgrounds'
import { isValidLoadingAnimation } from '@/components/profile-loading-animations'
```

Then find:

```typescript
  const { profileTheme, profileTagline, avatarDecoration, profileBackground } = body as {
    profileTheme?: string
    profileTagline?: string
    avatarDecoration?: string
    profileBackground?: string
  }

  const validTheme = isValidProfileTheme(profileTheme) ? profileTheme : undefined

  const validTagline =
    typeof profileTagline === 'string' ? sanitizeTagline(profileTagline) : undefined

  const validDecoration = isValidAvatarDecoration(avatarDecoration) ? avatarDecoration : undefined

  const validBackground = isValidProfileBackground(profileBackground) ? profileBackground : undefined

  await prisma.user.update({
    where: { lastfmUsername: session.lastfmUsername },
    data: {
      ...(validTheme !== undefined ? { profileTheme: validTheme } : {}),
      ...(validTagline !== undefined ? { profileTagline: validTagline } : {}),
      ...(validDecoration !== undefined ? { avatarDecoration: validDecoration } : {}),
      ...(validBackground !== undefined ? { profileBackground: validBackground } : {}),
    },
  })

  return NextResponse.json({
    ok: true,
    profileTheme: validTheme,
    profileTagline: validTagline,
    avatarDecoration: validDecoration,
    profileBackground: validBackground,
  })
```

Change to:

```typescript
  const { profileTheme, profileTagline, avatarDecoration, profileBackground, loadingAnimation } = body as {
    profileTheme?: string
    profileTagline?: string
    avatarDecoration?: string
    profileBackground?: string
    loadingAnimation?: string
  }

  const validTheme = isValidProfileTheme(profileTheme) ? profileTheme : undefined

  const validTagline =
    typeof profileTagline === 'string' ? sanitizeTagline(profileTagline) : undefined

  const validDecoration = isValidAvatarDecoration(avatarDecoration) ? avatarDecoration : undefined

  const validBackground = isValidProfileBackground(profileBackground) ? profileBackground : undefined

  const validLoadingAnimation = isValidLoadingAnimation(loadingAnimation) ? loadingAnimation : undefined

  await prisma.user.update({
    where: { lastfmUsername: session.lastfmUsername },
    data: {
      ...(validTheme !== undefined ? { profileTheme: validTheme } : {}),
      ...(validTagline !== undefined ? { profileTagline: validTagline } : {}),
      ...(validDecoration !== undefined ? { avatarDecoration: validDecoration } : {}),
      ...(validBackground !== undefined ? { profileBackground: validBackground } : {}),
      ...(validLoadingAnimation !== undefined ? { loadingAnimation: validLoadingAnimation } : {}),
    },
  })

  return NextResponse.json({
    ok: true,
    profileTheme: validTheme,
    profileTagline: validTagline,
    avatarDecoration: validDecoration,
    profileBackground: validBackground,
    loadingAnimation: validLoadingAnimation,
  })
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/api/profile-customization.test.ts`
Expected: `Test Files  1 passed`, `Tests  5 passed`

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add app/api/profile-customization/route.ts tests/api/profile-customization.test.ts
git commit -m "feat: accept and persist loadingAnimation in customization API"
```

---

### Task 4: Restructure the profile page with a scoped Suspense boundary

**Files:**
- Modify: `app/user/[username]/page.tsx` (full-file replacement — this task restructures the whole default export)

**Interfaces:**
- Consumes: `ProfileLoadingAnimation`, `isValidLoadingAnimation`, `type LoadingAnimationKey` from `@/components/profile-loading-animations` (Task 2); `User.loadingAnimation` (Task 1).
- Produces: `app/user/[username]/page.tsx` exports `UserProfilePage` (unchanged signature) plus a new internal `ProfilePageContent` component — not exported, not consumed elsewhere.

- [ ] **Step 1: Replace the entire contents of `app/user/[username]/page.tsx`**

The existence-check/sync logic (which can call `notFound()`) now uses a cheap `select`-only query and runs entirely in the outer, blocking part of the page — this must happen *before* the `<Suspense>` boundary, since Next.js cannot change the HTTP status code after the response starts streaming. The `loadingAnimation` preset is read as part of that same cheap query (no extra round trip). Everything else (the heavy `include`-based query, the `Promise.all` of Last.fm + chart queries, and all derived stats) moves into `ProfilePageContent`, which is referenced as a JSX element (not awaited) so React/Next can stream it under the Suspense boundary.

```tsx
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { syncUser } from '@/lib/sync'
import { lastfmClient } from '@/lib/lastfm'
import { UserProfile } from '@/components/user-profile'
import { DEFAULT_ORDER, type WidgetId, type WidgetSize } from '@/lib/dashboard-widgets'
import type { Period } from '@/lib/lastfm'
import {
  ProfileLoadingAnimation,
  isValidLoadingAnimation,
  type LoadingAnimationKey,
} from '@/components/profile-loading-animations'

type Props = { params: Promise<{ username: string }> }

const PERIODS = ['7day', '1month', '3month', '6month', '12month', 'overall'] as const

function groupByPeriod<T extends { period: string }>(items: T[]): Record<Period, T[]> {
  return Object.fromEntries(
    PERIODS.map((p) => [p, items.filter((i) => i.period === p)]),
  ) as Record<Period, T[]>
}

const INCLUDE = {
  scrobbles: { orderBy: { scrobbledAt: 'desc' } as const, take: 50 },
  topArtists: true,
  topAlbums: true,
  topTracks: true,
  lovedTracks: { orderBy: { lovedAt: 'desc' } as const, take: 100 },
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username} — Last.fm Advanced` }
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params

  // Cheap existence probe — resolved (and any notFound() thrown) before the
  // Suspense boundary below starts streaming, since Next.js cannot change
  // the HTTP status code once the response body has started streaming.
  let existing = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { id: true, lastSyncedAt: true, loadingAnimation: true },
  })

  // Sync if: user doesn't exist yet, OR exists but never completed a sync
  if (!existing || !existing.lastSyncedAt) {
    try {
      await lastfmClient.getUserInfo(username) // 404s if username invalid on Last.fm
      if (!existing) {
        await prisma.user.create({ data: { lastfmUsername: username, sessionKey: '' } })
      }
      await syncUser(username)
    } catch {
      // If user was never in DB and sync failed, 404. If stub exists, fall through and show what we have.
      if (!existing) notFound()
    }
    existing = await prisma.user.findUnique({
      where: { lastfmUsername: username },
      select: { id: true, lastSyncedAt: true, loadingAnimation: true },
    })
    if (!existing) notFound()
  }

  const preset: LoadingAnimationKey = isValidLoadingAnimation(existing.loadingAnimation)
    ? existing.loadingAnimation
    : 'none'

  return (
    <Suspense fallback={<ProfileLoadingAnimation preset={preset} />}>
      <ProfilePageContent username={username} />
    </Suspense>
  )
}

async function ProfilePageContent({ username }: { username: string }) {
  const session = await getSession()

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username }, include: INCLUDE })
  if (!user) notFound()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 360 * 24 * 60 * 60 * 1000)
  const [userInfo, chartScrobbles, uniqueArtistsResult, uniqueTracksResult, uniqueAlbumsResult, firstScrobble] = await Promise.all([
    lastfmClient.getUserInfo(username).catch(() => null),
    prisma.scrobble.findMany({
      where: { userId: user.id, scrobbledAt: { gte: thirtyDaysAgo } },
      select: { scrobbledAt: true, artist: true, track: true },
    }),
    prisma.scrobble.groupBy({ by: ['artist'], where: { userId: user.id }, _count: true }),
    prisma.scrobble.groupBy({ by: ['track', 'artist'], where: { userId: user.id }, _count: true }),
    prisma.scrobble.groupBy({ by: ['album'], where: { userId: user.id, album: { not: null } }, _count: true }),
    prisma.scrobble.findFirst({
      where: { userId: user.id },
      orderBy: { scrobbledAt: 'asc' },
      select: { scrobbledAt: true },
    }),
  ])
  const isOwner = session?.lastfmUsername === username

  const savedLayout: { order?: WidgetId[]; sizes?: Partial<Record<WidgetId, WidgetSize>> } | undefined = (() => {
    try {
      const raw = user.dashboardOrder
      if (!raw) return undefined
      const parsed = JSON.parse(raw) as WidgetId[] | { order?: WidgetId[]; sizes?: Partial<Record<WidgetId, WidgetSize>> }
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((id) => (DEFAULT_ORDER as readonly string[]).includes(id))
        const added = DEFAULT_ORDER.filter((id) => !valid.includes(id))
        return { order: [...valid, ...added] }
      }

      const validOrder = Array.isArray(parsed.order)
        ? parsed.order.filter((id) => (DEFAULT_ORDER as readonly string[]).includes(id))
        : undefined
      const added = DEFAULT_ORDER.filter((id) => !validOrder?.includes(id))
      const validSizes = parsed.sizes && typeof parsed.sizes === 'object'
        ? Object.fromEntries(
            Object.entries(parsed.sizes)
              .filter(([id, value]) => (DEFAULT_ORDER as readonly string[]).includes(id) && (value === 1 || value === 2)),
          ) as Partial<Record<WidgetId, WidgetSize>>
        : undefined

      return {
        order: validOrder ? [...validOrder, ...added] : [...DEFAULT_ORDER],
        sizes: validSizes,
      }
    } catch { return undefined }
  })()

  const savedOrder = savedLayout?.order
  const savedSizes = savedLayout?.sizes

  const savedHidden: WidgetId[] | undefined = (() => {
    try {
      const raw = user.dashboardHidden
      if (!raw) return undefined
      return (JSON.parse(raw) as WidgetId[]).filter((id) => (DEFAULT_ORDER as readonly string[]).includes(id))
    } catch { return undefined }
  })()

  const uniqueArtistCount = uniqueArtistsResult.length
  const uniqueTrackCount = uniqueTracksResult.length
  const uniqueAlbumCount = uniqueAlbumsResult.length

  // Scrobbles per day average
  const registeredDate = userInfo?.registered ?? user.createdAt
  const daysSinceRegistration = Math.max(
    1,
    Math.floor((now.getTime() - new Date(registeredDate).getTime()) / (1000 * 60 * 60 * 24)),
  )
  const totalScrobblesCount = userInfo?.playcount ?? user.scrobbles.length
  const scrobblesPerDay = totalScrobblesCount / daysSinceRegistration

  // Longest streak from all scrobbles date range: use chartScrobbles only (30-day window)
  // We'll compute it client-side in the component from allScrobbles; pass null here

  const profileStats = {
    uniqueArtists: uniqueArtistCount,
    uniqueTracks: uniqueTrackCount,
    uniqueAlbums: uniqueAlbumCount,
    scrobblesPerDay: Math.round(scrobblesPerDay * 10) / 10,
    firstScrobbleAt: firstScrobble?.scrobbledAt ?? null,
  }

  const totalScrobbles = totalScrobblesCount
  const imageUrl = userInfo?.imageUrl?.includes('2a96cbd8b46e442fc41c2b86b821562f') ? '' : (userInfo?.imageUrl ?? '')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: username,
            url: `https://lastfm-advanced.vercel.app/user/${username}`,
            ...(imageUrl ? { image: imageUrl } : {}),
            description: `${username} has scrobbled ${totalScrobbles.toLocaleString('en-US')} tracks on Last.fm`,
            memberOf: {
              '@type': 'Organization',
              name: 'Last.fm',
              url: 'https://www.last.fm',
            },
            sameAs: [`https://www.last.fm/user/${username}`],
          }),
        }}
      />
      <UserProfile
        username={user.lastfmUsername}
        totalScrobbles={totalScrobbles}
        registeredAt={registeredDate}
        imageUrl={imageUrl}
        lastSyncedAt={user.lastSyncedAt}
        isOwner={isOwner}
        initialDashboardOrder={savedOrder}
        initialDashboardHidden={savedHidden}
        initialDashboardSizes={savedSizes}
        recentTracks={user.scrobbles.map((s) => ({
          artist: s.artist,
          album: s.album,
          track: s.track,
          scrobbledAt: s.scrobbledAt,
        }))}
        topArtists={groupByPeriod(user.topArtists)}
        topAlbums={groupByPeriod(user.topAlbums)}
        topTracks={groupByPeriod(user.topTracks)}
        lovedTracks={user.lovedTracks.map((l) => ({ artist: l.artist, track: l.track, lovedAt: l.lovedAt }))}
        allScrobbles={chartScrobbles}
        profileStats={profileStats}
      />
    </>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 3: Manual verification — 404 status and Suspense scoping**

Run: `npm run dev` (starts on port 4000)

Confirm the true-404 path still works (a username with no Last.fm account at all):
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/user/this-username-should-not-exist-12345
```
Expected: `404`

Visit `http://localhost:4000/user/<any-existing-username>` and confirm the dashboard loads normally (no change visible yet — no preset has been set, so the fallback renders `null`).

- [ ] **Step 4: Commit**

```bash
git add app/user/[username]/page.tsx
git commit -m "feat: scope a Suspense boundary around the profile page's own data fetching"
```

---

### Task 5: Wire the loading animation into the layout and live editor

**Files:**
- Modify: `app/user/[username]/layout.tsx`
- Modify: `components/profile-banner-live.tsx`

**Interfaces:**
- Consumes: `LOADING_ANIMATION_KEYS`, `LOADING_ANIMATION_LABELS`, `isValidLoadingAnimation`, `ProfileLoadingAnimationPreview`, `type LoadingAnimationKey` from `@/components/profile-loading-animations` (Task 2); the extended `/api/profile-customization` POST body (Task 3).
- Produces: the live editor popover gets a working "Loading animation" picker.

- [ ] **Step 1: Add `loadingAnimation` to the profile layout's query and props**

In `app/user/[username]/layout.tsx`, find:

```typescript
      select: {
        id: true,
        createdAt: true,
        lastSyncedAt: true,
        profileTheme: true,
        profileTagline: true,
        avatarDecoration: true,
        profileBackground: true,
      },
```

Change to:

```typescript
      select: {
        id: true,
        createdAt: true,
        lastSyncedAt: true,
        profileTheme: true,
        profileTagline: true,
        avatarDecoration: true,
        profileBackground: true,
        loadingAnimation: true,
      },
```

Then find:

```tsx
        <ProfileBannerLive
          username={username}
          imageUrl={imageUrl}
          totalScrobbles={totalScrobbles}
          registeredAt={registeredAt}
          years={years}
          isOwner={isOwner}
          lastSyncedAt={user?.lastSyncedAt ?? null}
          initialTheme={user?.profileTheme ?? null}
          initialTagline={user?.profileTagline ?? null}
          initialAvatarDecoration={user?.avatarDecoration ?? null}
          initialBackground={user?.profileBackground ?? null}
        />
```

Change to:

```tsx
        <ProfileBannerLive
          username={username}
          imageUrl={imageUrl}
          totalScrobbles={totalScrobbles}
          registeredAt={registeredAt}
          years={years}
          isOwner={isOwner}
          lastSyncedAt={user?.lastSyncedAt ?? null}
          initialTheme={user?.profileTheme ?? null}
          initialTagline={user?.profileTagline ?? null}
          initialAvatarDecoration={user?.avatarDecoration ?? null}
          initialBackground={user?.profileBackground ?? null}
          initialLoadingAnimation={user?.loadingAnimation ?? null}
        />
```

- [ ] **Step 2: Update `components/profile-banner-live.tsx` imports and props**

Find:

```typescript
import {
  ProfileBackgroundLayer,
  ProfileBackgroundPreview,
  PROFILE_BACKGROUND_KEYS,
  PROFILE_BACKGROUND_LABELS,
  isValidProfileBackground,
  type ProfileBackgroundKey,
} from '@/components/profile-backgrounds'
```

Change to:

```typescript
import {
  ProfileBackgroundLayer,
  ProfileBackgroundPreview,
  PROFILE_BACKGROUND_KEYS,
  PROFILE_BACKGROUND_LABELS,
  isValidProfileBackground,
  type ProfileBackgroundKey,
} from '@/components/profile-backgrounds'
import {
  ProfileLoadingAnimationPreview,
  LOADING_ANIMATION_KEYS,
  LOADING_ANIMATION_LABELS,
  isValidLoadingAnimation,
  type LoadingAnimationKey,
} from '@/components/profile-loading-animations'
```

Find:

```typescript
interface ProfileBannerLiveProps {
  username: string
  imageUrl: string
  totalScrobbles: number
  registeredAt: Date
  years: number
  isOwner: boolean
  lastSyncedAt: Date | null
  initialTheme: string | null
  initialTagline: string | null
  initialAvatarDecoration: string | null
  initialBackground: string | null
}
```

Change to:

```typescript
interface ProfileBannerLiveProps {
  username: string
  imageUrl: string
  totalScrobbles: number
  registeredAt: Date
  years: number
  isOwner: boolean
  lastSyncedAt: Date | null
  initialTheme: string | null
  initialTagline: string | null
  initialAvatarDecoration: string | null
  initialBackground: string | null
  initialLoadingAnimation: string | null
}
```

Find the function signature:

```typescript
export function ProfileBannerLive({
  username,
  imageUrl,
  totalScrobbles,
  registeredAt,
  years,
  isOwner,
  lastSyncedAt,
  initialTheme,
  initialTagline,
  initialAvatarDecoration,
  initialBackground,
}: ProfileBannerLiveProps) {
```

Change to:

```typescript
export function ProfileBannerLive({
  username,
  imageUrl,
  totalScrobbles,
  registeredAt,
  years,
  isOwner,
  lastSyncedAt,
  initialTheme,
  initialTagline,
  initialAvatarDecoration,
  initialBackground,
  initialLoadingAnimation,
}: ProfileBannerLiveProps) {
```

- [ ] **Step 3: Add loading-animation state, handler, and update `persist`/reset**

Find:

```typescript
  const [background, setBackground] = useState<ProfileBackgroundKey>(
    isValidProfileBackground(initialBackground) ? initialBackground : 'none',
  )
  const [editing, setEditing] = useState(false)
```

Change to:

```typescript
  const [background, setBackground] = useState<ProfileBackgroundKey>(
    isValidProfileBackground(initialBackground) ? initialBackground : 'none',
  )
  const [loadingAnimation, setLoadingAnimation] = useState<LoadingAnimationKey>(
    isValidLoadingAnimation(initialLoadingAnimation) ? initialLoadingAnimation : 'none',
  )
  const [editing, setEditing] = useState(false)
```

Find:

```typescript
  async function persist(payload: {
    profileTheme?: string
    profileTagline?: string
    avatarDecoration?: string
    profileBackground?: string
  }) {
```

Change to:

```typescript
  async function persist(payload: {
    profileTheme?: string
    profileTagline?: string
    avatarDecoration?: string
    profileBackground?: string
    loadingAnimation?: string
  }) {
```

Find:

```typescript
  function handleBackgroundSelect(key: ProfileBackgroundKey) {
    setBackground(key)
    persist({ profileBackground: key })
  }
```

Change to:

```typescript
  function handleBackgroundSelect(key: ProfileBackgroundKey) {
    setBackground(key)
    persist({ profileBackground: key })
  }

  function handleLoadingAnimationSelect(key: LoadingAnimationKey) {
    setLoadingAnimation(key)
    persist({ loadingAnimation: key })
  }
```

Find:

```typescript
  function handleReset() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setTheme('default')
    setTagline('')
    setDecoration('none')
    setBackground('none')
    persist({
      profileTheme: 'default',
      profileTagline: '',
      avatarDecoration: 'none',
      profileBackground: 'none',
    })
  }
```

Change to:

```typescript
  function handleReset() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setTheme('default')
    setTagline('')
    setDecoration('none')
    setBackground('none')
    setLoadingAnimation('none')
    persist({
      profileTheme: 'default',
      profileTagline: '',
      avatarDecoration: 'none',
      profileBackground: 'none',
      loadingAnimation: 'none',
    })
  }
```

- [ ] **Step 4: Add the picker section to the editor popover**

Find the end of the "Background" picker section (right before the "Tagline" section):

```tsx
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Background</p>
                    <div className="grid grid-cols-3 gap-2">
                      {PROFILE_BACKGROUND_KEYS.map((key) => {
                        const isSelected = background === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleBackgroundSelect(key)}
                            aria-pressed={isSelected}
                            title={PROFILE_BACKGROUND_LABELS[key]}
                            className="rounded-lg p-1 flex items-center justify-center transition-colors"
                            style={{
                              background: isSelected ? 'color-mix(in oklch, var(--profile-accent, var(--primary)) 15%, transparent)' : 'transparent',
                              border: isSelected ? '1px solid var(--profile-accent, var(--primary))' : '1px solid transparent',
                            }}
                          >
                            <ProfileBackgroundPreview pattern={key} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium">Tagline</p>
```

Change to:

```tsx
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Background</p>
                    <div className="grid grid-cols-3 gap-2">
                      {PROFILE_BACKGROUND_KEYS.map((key) => {
                        const isSelected = background === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleBackgroundSelect(key)}
                            aria-pressed={isSelected}
                            title={PROFILE_BACKGROUND_LABELS[key]}
                            className="rounded-lg p-1 flex items-center justify-center transition-colors"
                            style={{
                              background: isSelected ? 'color-mix(in oklch, var(--profile-accent, var(--primary)) 15%, transparent)' : 'transparent',
                              border: isSelected ? '1px solid var(--profile-accent, var(--primary))' : '1px solid transparent',
                            }}
                          >
                            <ProfileBackgroundPreview pattern={key} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium">Loading animation</p>
                    <div className="grid grid-cols-4 gap-2">
                      {LOADING_ANIMATION_KEYS.map((key) => {
                        const isSelected = loadingAnimation === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleLoadingAnimationSelect(key)}
                            aria-pressed={isSelected}
                            title={LOADING_ANIMATION_LABELS[key]}
                            className="rounded-lg p-1 flex items-center justify-center transition-colors"
                            style={{
                              background: isSelected ? 'color-mix(in oklch, var(--profile-accent, var(--primary)) 15%, transparent)' : 'transparent',
                              border: isSelected ? '1px solid var(--profile-accent, var(--primary))' : '1px solid transparent',
                            }}
                          >
                            <ProfileLoadingAnimationPreview preset={key} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium">Tagline</p>
```

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 6: Manual verification**

Run: `npm run dev` (starts on port 4000)

Visit `http://localhost:4000/user/<your-username>` while logged in, open the pencil-icon editor, and click through each Loading animation swatch — the selection should highlight immediately and a "Saved" message should flash.

Reload the page. Since the fallback only shows while `ProfilePageContent` is actually fetching, throttle the network (DevTools → Network → Slow 3G) and reload again to see the chosen animation render briefly before the dashboard appears.

- [ ] **Step 7: Commit**

```bash
git add app/user/[username]/layout.tsx components/profile-banner-live.tsx
git commit -m "feat: wire loading animation into layout and live editor"
```

---

### Task 6: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: only the pre-existing, unrelated `tests/placeholder.test.ts` errors (missing `describe`/`it`/`expect` types)

- [ ] **Step 2: Full test suite**

Run: `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next`
Expected: no new failures beyond the known pre-existing ones (`tests/components/top-lists.test.tsx` ×2, `tests/components/user-profile.test.tsx` ×1 — both traced to missing `next/navigation` mocks that predate this feature)

- [ ] **Step 3: Production build**

Run: `npx next build`
Expected: succeeds, all routes listed including `/user/[username]` and its sub-routes

- [ ] **Step 4: Sub-page scoping check**

Visit `/user/<username>/achievements`, `/user/<username>/history`, `/user/<username>/genres` directly (hard reload each). None of these should ever show the loading-animation fallback — confirm by reading `app/user/[username]/achievements/page.tsx` etc. and verifying none of them import or reference `ProfileLoadingAnimation` (only `app/user/[username]/page.tsx` should).

- [ ] **Step 5: 404 status re-check**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/user/this-username-should-not-exist-12345
```
Expected: `404` (confirms Task 4's restructuring didn't regress this into a 200-with-noindex "soft 404")

- [ ] **Step 6: Commit** (only if any fixes were needed in this task)

```bash
git add -A
git commit -m "fix: address issues found in final verification pass"
```
