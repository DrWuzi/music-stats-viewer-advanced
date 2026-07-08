# Profile Custom Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a profile owner pick a decorative background pattern (accent-tinted, CSS/SVG-only) for their entire profile page, persisted to the DB and visible to every visitor.

**Architecture:** A fourth `User.profileBackground` field joins the existing `profileTheme`/`profileTagline`/`avatarDecoration` customization system. A single new file (`components/profile-backgrounds.tsx`) holds the pattern catalog, validator, and renderers — mirroring `components/avatar-decorations.tsx`'s structure exactly (not `lib/profile-themes.ts`, which is data-only with no JSX). The layer renders `position: fixed` behind all content, tinted by whichever accent color (`--profile-accent`) is already active, and is wired into the existing pencil-icon live editor in `components/profile-banner-live.tsx`.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + Postgres, Tailwind v4, Vitest + Testing Library, TypeScript.

## Global Constraints

- Reference spec: `docs/superpowers/specs/2026-07-08-profile-background-design.md` — read it before starting if anything below is unclear.
- 7 pattern keys exactly: `none | aurora | particles | grid | waves | glow | constellation`. `none` is the default (no behavior change for existing users).
- Patterns render via `currentColor` set to `var(--profile-accent, var(--primary))` — never a separate color picker.
- No image upload, no per-sub-page overrides, no canvas/WebGL — CSS/SVG animation only.
- Every animated pattern must stop under `prefers-reduced-motion: reduce`.
- The background layer must have a hard `display: none !important` under `@media print` (not reliance on the generic universal print override, which forces `opacity: 1` and would make it worse, not better).
- Windows dev server runs on port 4000 (`npm run dev`) — ports 3000/3001 are Windows-reserved on this machine and will fail with `EACCES`.
- Run `npx tsc --noEmit` after every task; only pre-existing failures in `tests/placeholder.test.ts` are acceptable, nothing else.
- Run tests with `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next` — this repo has stale leftover git worktrees under `.claude/worktrees/` from an earlier session that vitest's default include glob would otherwise pick up; excluding them is required or you'll see unrelated failures that aren't yours.

---

### Task 1: Prisma schema field + migration + test mock updates

**Files:**
- Modify: `prisma/schema.prisma` (add one field to the `User` model)
- Modify: `tests/api/sync.test.ts:34-38, 53-55, 59-61` (3 mock `User` objects)
- Modify: `tests/lib/sync.test.ts:39-44` (1 mock `User` object)

**Interfaces:**
- Produces: `User.profileBackground: string | null` — every later task that touches a `User` record (Prisma queries, mocks) must include this field.

- [ ] **Step 1: Add the field to the schema**

In `prisma/schema.prisma`, find:

```prisma
  profileTheme      String?
  profileTagline    String?
  avatarDecoration  String?
```

Change to:

```prisma
  profileTheme      String?
  profileTagline    String?
  avatarDecoration  String?
  profileBackground String?
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name add_profile_background`

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

In `tests/api/sync.test.ts`, there are 3 mock `User` objects, each ending in `profileTheme: null, profileTagline: null, avatarDecoration: null,` (two are on one line, one spans multiple lines). Add `profileBackground: null,` immediately after `avatarDecoration: null,` in all 3 (lines ~38, ~55, ~61).

Example (first occurrence, lines 34-38):
```typescript
      dashboardOrder: null,
      dashboardHidden: null,
      profileTheme: null,
      profileTagline: null,
      avatarDecoration: null,
      profileBackground: null,
    })
```

- [ ] **Step 5: Update `tests/lib/sync.test.ts` mock**

In `tests/lib/sync.test.ts:39-44`, the single mock `User` object ends in `profileTheme: null, profileTagline: null, avatarDecoration: null,`. Add `profileBackground: null,` immediately after:

```typescript
      dashboardOrder: null,
      dashboardHidden: null,
      profileTheme: null,
      profileTagline: null,
      avatarDecoration: null,
      profileBackground: null,
    })
```

- [ ] **Step 6: Verify types and tests**

Run: `npx tsc --noEmit`
Expected: no output (only pre-existing `tests/placeholder.test.ts` errors are acceptable — there should be zero Prisma/schema-related errors)

Run: `npx vitest run tests/api/sync.test.ts tests/lib/sync.test.ts`
Expected: `Test Files  2 passed`, `Tests  5 passed`

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations tests/api/sync.test.ts tests/lib/sync.test.ts
git commit -m "feat: add profileBackground field to User model"
```

---

### Task 2: `components/profile-backgrounds.tsx` — catalog, validator, renderers

**Files:**
- Create: `components/profile-backgrounds.tsx`
- Create: `tests/components/profile-backgrounds.test.tsx`
- Modify: `app/globals.css` (new keyframes, animation classes, reduced-motion guard, print-safety rule)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (used by Task 3 and Task 4):
  - `export type ProfileBackgroundKey = 'none' | 'aurora' | 'particles' | 'grid' | 'waves' | 'glow' | 'constellation'`
  - `export const PROFILE_BACKGROUND_KEYS: ProfileBackgroundKey[]`
  - `export const PROFILE_BACKGROUND_LABELS: Record<ProfileBackgroundKey, string>`
  - `export function isValidProfileBackground(value: unknown): value is ProfileBackgroundKey`
  - `export function ProfileBackgroundLayer({ pattern }: { pattern: ProfileBackgroundKey }): JSX.Element | null` — renders `null` for `'none'`, otherwise a `position: fixed` full-viewport layer with className `profile-bg-layer`.
  - `export function ProfileBackgroundPreview({ pattern }: { pattern: ProfileBackgroundKey }): JSX.Element` — small static swatch for the picker UI, never `null`.

- [ ] **Step 1: Write the failing tests**

Create `tests/components/profile-backgrounds.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  ProfileBackgroundLayer,
  ProfileBackgroundPreview,
  PROFILE_BACKGROUND_KEYS,
  isValidProfileBackground,
  type ProfileBackgroundKey,
} from '@/components/profile-backgrounds'

describe('isValidProfileBackground', () => {
  it('accepts every known key', () => {
    for (const key of PROFILE_BACKGROUND_KEYS) {
      expect(isValidProfileBackground(key)).toBe(true)
    }
  })

  it('rejects unknown values', () => {
    expect(isValidProfileBackground('not-a-real-pattern')).toBe(false)
    expect(isValidProfileBackground(null)).toBe(false)
    expect(isValidProfileBackground(undefined)).toBe(false)
    expect(isValidProfileBackground(42)).toBe(false)
  })
})

describe('ProfileBackgroundLayer', () => {
  it('renders nothing for "none"', () => {
    const { container } = render(<ProfileBackgroundLayer pattern="none" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a layer with the profile-bg-layer class for every non-none pattern', () => {
    const patterns = PROFILE_BACKGROUND_KEYS.filter(
      (k): k is Exclude<ProfileBackgroundKey, 'none'> => k !== 'none',
    )
    for (const pattern of patterns) {
      const { container } = render(<ProfileBackgroundLayer pattern={pattern} />)
      expect(container.querySelector('.profile-bg-layer')).not.toBeNull()
    }
  })
})

describe('ProfileBackgroundPreview', () => {
  it('renders something for every pattern including none', () => {
    for (const pattern of PROFILE_BACKGROUND_KEYS) {
      const { container } = render(<ProfileBackgroundPreview pattern={pattern} />)
      expect(container.firstChild).not.toBeNull()
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/profile-backgrounds.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/profile-backgrounds"`

- [ ] **Step 3: Create `components/profile-backgrounds.tsx`**

```typescript
/**
 * Profile background patterns — a full-viewport decorative layer behind the
 * profile page content, tinted by whatever accent theme (see
 * lib/profile-themes.ts) the profile owner has chosen. Pure CSS/SVG, no
 * canvas/WebGL, so there's no per-frame JS cost. Mirrors the structure of
 * components/avatar-decorations.tsx (types + validator + JSX renderers all
 * in one file — not split into a separate lib/ data file, since these
 * patterns need real markup, not just data).
 *
 * IMPORTANT: the wrapper div here carries the `profile-bg-layer` class,
 * which app/globals.css's `@media print` block sets to `display: none`
 * explicitly — the generic print override forces `opacity: 1` on
 * everything, which would make a deliberately faint decorative layer render
 * at full strength on a printed page, so this needs its own explicit kill
 * rather than relying on that generic rule.
 */

import type { ReactNode } from 'react'

export type ProfileBackgroundKey =
  | 'none'
  | 'aurora'
  | 'particles'
  | 'grid'
  | 'waves'
  | 'glow'
  | 'constellation'

export const PROFILE_BACKGROUND_KEYS: ProfileBackgroundKey[] = [
  'none',
  'aurora',
  'particles',
  'grid',
  'waves',
  'glow',
  'constellation',
]

export const PROFILE_BACKGROUND_LABELS: Record<ProfileBackgroundKey, string> = {
  none: 'None',
  aurora: 'Aurora',
  particles: 'Particles',
  grid: 'Grid',
  waves: 'Waves',
  glow: 'Glow',
  constellation: 'Constellation',
}

export function isValidProfileBackground(value: unknown): value is ProfileBackgroundKey {
  return typeof value === 'string' && (PROFILE_BACKGROUND_KEYS as string[]).includes(value)
}

const ACCENT = 'var(--profile-accent, var(--primary))'

function Aurora() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="profile-bg-aurora-a absolute rounded-full"
        style={{
          top: '-10%',
          left: '-10%',
          width: '60vmax',
          height: '60vmax',
          color: ACCENT,
          background: 'radial-gradient(circle, currentColor 0%, transparent 70%)',
          opacity: 0.14,
          filter: 'blur(40px)',
        }}
      />
      <div
        className="profile-bg-aurora-b absolute rounded-full"
        style={{
          bottom: '-15%',
          right: '-10%',
          width: '55vmax',
          height: '55vmax',
          color: ACCENT,
          background: 'radial-gradient(circle, currentColor 0%, transparent 70%)',
          opacity: 0.12,
          filter: 'blur(40px)',
        }}
      />
    </div>
  )
}

function Particles() {
  return (
    <div
      className="profile-bg-particles absolute inset-0"
      style={{
        color: ACCENT,
        backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)',
        backgroundSize: '48px 48px',
        opacity: 0.16,
      }}
    />
  )
}

function Grid() {
  return (
    <div
      className="absolute inset-0"
      style={
        {
          color: ACCENT,
          backgroundImage:
            'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          opacity: 0.08,
          maskImage: 'radial-gradient(ellipse at 50% 30%, black 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 0%, transparent 75%)',
        } as React.CSSProperties
      }
    />
  )
}

function Waves() {
  return (
    <svg
      className="absolute inset-x-0 bottom-0 w-full"
      style={{ color: ACCENT, height: '40vh' }}
      viewBox="0 0 1600 400"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <path
        d="M0 260 Q 200 200 400 260 T 800 260 T 1200 260 T 1600 260 V 400 H 0 Z"
        fill="currentColor"
        opacity="0.08"
      />
      <path
        d="M0 300 Q 200 250 400 300 T 800 300 T 1200 300 T 1600 300 V 400 H 0 Z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M0 340 Q 200 300 400 340 T 800 340 T 1200 340 T 1600 340 V 400 H 0 Z"
        fill="currentColor"
        opacity="0.16"
      />
    </svg>
  )
}

function Glow() {
  return (
    <div
      className="profile-bg-glow absolute"
      style={{
        top: '-20%',
        right: '-15%',
        width: '70vmax',
        height: '70vmax',
        color: ACCENT,
        background: 'radial-gradient(circle, currentColor 0%, transparent 65%)',
        opacity: 0.16,
      }}
    />
  )
}

const CONSTELLATION_DOTS = [
  { x: 120, y: 90 },
  { x: 260, y: 160 },
  { x: 210, y: 280 },
  { x: 380, y: 220 },
  { x: 1300, y: 120 },
  { x: 1420, y: 220 },
  { x: 1360, y: 320 },
  { x: 1180, y: 260 },
  { x: 700, y: 80 },
  { x: 820, y: 150 },
  { x: 900, y: 60 },
]
const CONSTELLATION_LINES: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
  [4, 5],
  [5, 6],
  [5, 7],
  [8, 9],
  [9, 10],
]

function Constellation() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      style={{ color: ACCENT }}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g stroke="currentColor" strokeWidth="1" opacity="0.18">
        {CONSTELLATION_LINES.map(([a, b], i) => (
          <line
            key={i}
            x1={CONSTELLATION_DOTS[a].x}
            y1={CONSTELLATION_DOTS[a].y}
            x2={CONSTELLATION_DOTS[b].x}
            y2={CONSTELLATION_DOTS[b].y}
          />
        ))}
      </g>
      <g fill="currentColor" opacity="0.5">
        {CONSTELLATION_DOTS.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="3" />
        ))}
      </g>
    </svg>
  )
}

function renderPattern(pattern: ProfileBackgroundKey): ReactNode {
  switch (pattern) {
    case 'aurora':
      return <Aurora />
    case 'particles':
      return <Particles />
    case 'grid':
      return <Grid />
    case 'waves':
      return <Waves />
    case 'glow':
      return <Glow />
    case 'constellation':
      return <Constellation />
    default:
      return null
  }
}

export function ProfileBackgroundLayer({ pattern }: { pattern: ProfileBackgroundKey }) {
  if (pattern === 'none') return null
  return (
    <div
      aria-hidden
      className="profile-bg-layer pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -1 }}
    >
      {renderPattern(pattern)}
    </div>
  )
}

/** Small static preview swatch used in the picker (no fixed positioning). */
export function ProfileBackgroundPreview({ pattern }: { pattern: ProfileBackgroundKey }) {
  if (pattern === 'none') {
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
      className="relative h-10 w-16 rounded-md overflow-hidden border"
      style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
    >
      {renderPattern(pattern)}
    </div>
  )
}
```

- [ ] **Step 4: Add keyframes, animation classes, reduced-motion guard, and print rule to `app/globals.css`**

Find the existing avatar-decoration animation block (ends with `.avatar-deco-ripple { ... }` around line 264) and add immediately after it:

```css
/* Profile background pattern animations (see components/profile-backgrounds.tsx) */
@keyframes profileBgAuroraDriftA {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(6%, 4%) scale(1.08); }
}
@keyframes profileBgAuroraDriftB {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-5%, -6%) scale(1.06); }
}
@keyframes profileBgParticlesDrift {
  from { background-position: 0 0; }
  to { background-position: 0 -480px; }
}
@keyframes profileBgGlowPulse {
  0%, 100% { opacity: 0.10; transform: scale(0.96); }
  50% { opacity: 0.20; transform: scale(1.04); }
}

.profile-bg-aurora-a { animation: profileBgAuroraDriftA 22s ease-in-out infinite; }
.profile-bg-aurora-b { animation: profileBgAuroraDriftB 26s ease-in-out infinite; }
.profile-bg-particles { animation: profileBgParticlesDrift 18s linear infinite; }
.profile-bg-glow { animation: profileBgGlowPulse 8s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .profile-bg-aurora-a,
  .profile-bg-aurora-b,
  .profile-bg-particles,
  .profile-bg-glow {
    animation: none !important;
  }
}
```

Then find the `@media print { ... }` block (starts around line 330) and add this rule inside it, right after the opening `{`:

```css
  /* Explicit kill — the generic `opacity: 1 !important` rule below would
     otherwise make this deliberately faint decorative layer render at full
     strength on a printed page instead of disappearing. */
  .profile-bg-layer {
    display: none !important;
  }

```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/components/profile-backgrounds.test.tsx`
Expected: `Test Files  1 passed`, `Tests  4 passed`

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 7: Commit**

```bash
git add components/profile-backgrounds.tsx tests/components/profile-backgrounds.test.tsx app/globals.css
git commit -m "feat: add profile background pattern catalog and renderers"
```

---

### Task 3: Extend the profile-customization API route

**Files:**
- Modify: `app/api/profile-customization/route.ts`
- Create: `tests/api/profile-customization.test.ts`

**Interfaces:**
- Consumes: `isValidProfileBackground` from `@/components/profile-backgrounds` (Task 2).
- Produces: `POST /api/profile-customization` accepts an optional `profileBackground` field in its JSON body and persists it when valid.

- [ ] **Step 1: Write the failing tests**

Create `tests/api/profile-customization.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { update: vi.fn() },
  },
}))

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/profile-customization', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/profile-customization', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue(null)

    const { POST } = await import('@/app/api/profile-customization/route')
    const res = await POST(makeRequest({ profileBackground: 'aurora' }))
    expect(res.status).toBe(401)
  })

  it('ignores an invalid profileBackground value', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue({ userId: 'u1', lastfmUsername: 'user' })
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/profile-customization/route')
    const res = await POST(makeRequest({ profileBackground: 'not-a-real-pattern' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.profileBackground).toBeUndefined()
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ profileBackground: expect.anything() }),
      }),
    )
  })

  it('persists a valid profileBackground value', async () => {
    const { getSession } = await import('@/lib/session')
    vi.mocked(getSession).mockResolvedValue({ userId: 'u1', lastfmUsername: 'user' })
    const { prisma } = await import('@/lib/prisma')
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/profile-customization/route')
    const res = await POST(makeRequest({ profileBackground: 'aurora' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.profileBackground).toBe('aurora')
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lastfmUsername: 'user' },
        data: expect.objectContaining({ profileBackground: 'aurora' }),
      }),
    )
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run tests/api/profile-customization.test.ts`
Expected: the 401 test passes (existing behavior), but the invalid/valid `profileBackground` tests FAIL since the route doesn't read that field yet — `body.profileBackground` is `undefined` in both cases and `prisma.user.update` is never called with it.

- [ ] **Step 3: Extend the route**

In `app/api/profile-customization/route.ts`, change:

```typescript
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isValidProfileTheme } from '@/lib/profile-themes'
import { isValidAvatarDecoration } from '@/components/avatar-decorations'
```

to:

```typescript
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isValidProfileTheme } from '@/lib/profile-themes'
import { isValidAvatarDecoration } from '@/components/avatar-decorations'
import { isValidProfileBackground } from '@/components/profile-backgrounds'
```

Then change:

```typescript
  const { profileTheme, profileTagline, avatarDecoration } = body as {
    profileTheme?: string
    profileTagline?: string
    avatarDecoration?: string
  }

  const validTheme = isValidProfileTheme(profileTheme) ? profileTheme : undefined

  const validTagline =
    typeof profileTagline === 'string' ? sanitizeTagline(profileTagline) : undefined

  const validDecoration = isValidAvatarDecoration(avatarDecoration) ? avatarDecoration : undefined

  await prisma.user.update({
    where: { lastfmUsername: session.lastfmUsername },
    data: {
      ...(validTheme !== undefined ? { profileTheme: validTheme } : {}),
      ...(validTagline !== undefined ? { profileTagline: validTagline } : {}),
      ...(validDecoration !== undefined ? { avatarDecoration: validDecoration } : {}),
    },
  })

  return NextResponse.json({
    ok: true,
    profileTheme: validTheme,
    profileTagline: validTagline,
    avatarDecoration: validDecoration,
  })
```

to:

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/api/profile-customization.test.ts`
Expected: `Test Files  1 passed`, `Tests  3 passed`

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add app/api/profile-customization/route.ts tests/api/profile-customization.test.ts
git commit -m "feat: accept and persist profileBackground in customization API"
```

---

### Task 4: Wire the background into the profile page and live editor

**Files:**
- Modify: `app/user/[username]/layout.tsx`
- Modify: `components/profile-banner-live.tsx`
- Modify: `app/layout.tsx` (root layout — stacking-order fix)

**Interfaces:**
- Consumes: `ProfileBackgroundLayer`, `ProfileBackgroundPreview`, `PROFILE_BACKGROUND_KEYS`, `PROFILE_BACKGROUND_LABELS`, `isValidProfileBackground`, `type ProfileBackgroundKey` from `@/components/profile-backgrounds` (Task 2); the extended `/api/profile-customization` POST body (Task 3).
- Produces: the live editor popover gets a working "Background" picker; the pattern renders visibly on every profile route.

- [ ] **Step 1: Fix the root-layout stacking order**

In `app/layout.tsx`, find:

```tsx
        <main className="min-h-screen bg-background pb-16 md:pb-0">{children}</main>
```

Change to:

```tsx
        {/* No bg-background here — <body> already applies the identical
            class (see app/globals.css's `@layer base` rule) one level up,
            painting even earlier in the stacking order. A `position:fixed;
            z-index:-1` decorative layer (see components/profile-backgrounds.tsx)
            paints *before* ordinary in-flow boxes like this one — if this
            div had its own opaque background, it would completely hide that
            layer. Removing the redundant copy here has zero visual effect on
            any page that doesn't add such a layer. */}
        <main className="min-h-screen pb-16 md:pb-0">{children}</main>
```

- [ ] **Step 2: Add `profileBackground` to the profile layout's query and props**

In `app/user/[username]/layout.tsx`, find:

```typescript
      select: {
        id: true,
        createdAt: true,
        lastSyncedAt: true,
        profileTheme: true,
        profileTagline: true,
        avatarDecoration: true,
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
        />
```

- [ ] **Step 3: Update `components/profile-banner-live.tsx` imports and props**

Find:

```typescript
import {
  AvatarDecoration,
  AvatarDecorationPreview,
  AVATAR_DECORATION_KEYS,
  AVATAR_DECORATION_LABELS,
  isValidAvatarDecoration,
  type AvatarDecorationKey,
} from '@/components/avatar-decorations'
```

Change to:

```typescript
import {
  AvatarDecoration,
  AvatarDecorationPreview,
  AVATAR_DECORATION_KEYS,
  AVATAR_DECORATION_LABELS,
  isValidAvatarDecoration,
  type AvatarDecorationKey,
} from '@/components/avatar-decorations'
import {
  ProfileBackgroundLayer,
  ProfileBackgroundPreview,
  PROFILE_BACKGROUND_KEYS,
  PROFILE_BACKGROUND_LABELS,
  isValidProfileBackground,
  type ProfileBackgroundKey,
} from '@/components/profile-backgrounds'
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
}: ProfileBannerLiveProps) {
```

- [ ] **Step 4: Add background state, handler, and update reset/persist**

Find:

```typescript
  const [decoration, setDecoration] = useState<AvatarDecorationKey>(
    isValidAvatarDecoration(initialAvatarDecoration) ? initialAvatarDecoration : 'none',
  )
  const [editing, setEditing] = useState(false)
```

Change to:

```typescript
  const [decoration, setDecoration] = useState<AvatarDecorationKey>(
    isValidAvatarDecoration(initialAvatarDecoration) ? initialAvatarDecoration : 'none',
  )
  const [background, setBackground] = useState<ProfileBackgroundKey>(
    isValidProfileBackground(initialBackground) ? initialBackground : 'none',
  )
  const [editing, setEditing] = useState(false)
```

Find:

```typescript
  async function persist(payload: {
    profileTheme?: string
    profileTagline?: string
    avatarDecoration?: string
  }) {
```

Change to:

```typescript
  async function persist(payload: {
    profileTheme?: string
    profileTagline?: string
    avatarDecoration?: string
    profileBackground?: string
  }) {
```

Find:

```typescript
  function handleDecorationSelect(key: AvatarDecorationKey) {
    setDecoration(key)
    persist({ avatarDecoration: key })
  }
```

Change to:

```typescript
  function handleDecorationSelect(key: AvatarDecorationKey) {
    setDecoration(key)
    persist({ avatarDecoration: key })
  }

  function handleBackgroundSelect(key: ProfileBackgroundKey) {
    setBackground(key)
    persist({ profileBackground: key })
  }
```

Find:

```typescript
  function handleReset() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setTheme('default')
    setTagline('')
    setDecoration('none')
    persist({ profileTheme: 'default', profileTagline: '', avatarDecoration: 'none' })
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
    persist({
      profileTheme: 'default',
      profileTagline: '',
      avatarDecoration: 'none',
      profileBackground: 'none',
    })
  }
```

- [ ] **Step 5: Render the background layer and add the picker section**

Find the opening of the returned JSX:

```tsx
  return (
    <>
      {/* This <style> tag's selector applies to the ancestor .profile-theme-scope
          element regardless of where this component sits in the tree — CSS
          custom properties then cascade to every descendant (banner, tabs,
          and the sub-page widgets rendered as {children} in the layout). */}
      {hasAccent && (
```

Change to:

```tsx
  return (
    <>
      <ProfileBackgroundLayer pattern={background} />

      {/* This <style> tag's selector applies to the ancestor .profile-theme-scope
          element regardless of where this component sits in the tree — CSS
          custom properties then cascade to every descendant (banner, tabs,
          and the sub-page widgets rendered as {children} in the layout). */}
      {hasAccent && (
```

Find the end of the "Avatar decoration" picker section (right before the "Tagline" section):

```tsx
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Avatar decoration</p>
                    <div className="grid grid-cols-5 gap-2">
                      {AVATAR_DECORATION_KEYS.map((key) => {
                        const isSelected = decoration === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleDecorationSelect(key)}
                            aria-pressed={isSelected}
                            title={AVATAR_DECORATION_LABELS[key]}
                            className="rounded-lg p-1 flex items-center justify-center transition-colors"
                            style={{
                              background: isSelected ? 'color-mix(in oklch, var(--profile-accent, var(--primary)) 15%, transparent)' : 'transparent',
                              border: isSelected ? '1px solid var(--profile-accent, var(--primary))' : '1px solid transparent',
                            }}
                          >
                            <AvatarDecorationPreview decoration={key} size={32} />
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
                    <p className="text-xs font-medium">Avatar decoration</p>
                    <div className="grid grid-cols-5 gap-2">
                      {AVATAR_DECORATION_KEYS.map((key) => {
                        const isSelected = decoration === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleDecorationSelect(key)}
                            aria-pressed={isSelected}
                            title={AVATAR_DECORATION_LABELS[key]}
                            className="rounded-lg p-1 flex items-center justify-center transition-colors"
                            style={{
                              background: isSelected ? 'color-mix(in oklch, var(--profile-accent, var(--primary)) 15%, transparent)' : 'transparent',
                              border: isSelected ? '1px solid var(--profile-accent, var(--primary))' : '1px solid transparent',
                            }}
                          >
                            <AvatarDecorationPreview decoration={key} size={32} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

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

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 7: Spot-check other routes are visually unaffected by the root-layout change**

Run: `npm run dev` (starts on port 4000 per this project's config)

Visit `http://localhost:4000/`, `http://localhost:4000/charts`, and `http://localhost:4000/settings` — each should render with the exact same background color as before (now supplied by `<body>` instead of the redundant `<main>` copy).

Visit `http://localhost:4000/user/<any-existing-username>`, open the pencil-icon editor, and click through each Background swatch — the pattern should render immediately behind the page content and persist after a page reload.

- [ ] **Step 8: Commit**

```bash
git add app/layout.tsx app/user/[username]/layout.tsx components/profile-banner-live.tsx
git commit -m "feat: wire profile background into layout and live editor"
```

---

### Task 5: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: only the pre-existing, unrelated `tests/placeholder.test.ts` errors (missing `describe`/`it`/`expect` types)

- [ ] **Step 2: Full test suite**

Run: `npx vitest run --exclude "**/.claude/**" --exclude node_modules --exclude .next`
Expected: no new failures beyond the 3 known pre-existing ones (`tests/components/top-lists.test.tsx` ×2, `tests/components/user-profile.test.tsx` ×1 — both traced to missing `next/navigation` mocks that predate this feature)

- [ ] **Step 3: Production build**

Run: `npx next build`
Expected: succeeds, all routes listed including `/user/[username]` and its sub-routes

- [ ] **Step 4: Print-mode trace**

Read `app/globals.css`'s `@media print` block and confirm `.profile-bg-layer { display: none !important; }` is present and appears before the generic `*, *::before, *::after { ... opacity: 1 !important ... }` rule's effect would otherwise apply.

- [ ] **Step 5: Commit** (only if any fixes were needed in this task)

```bash
git add -A
git commit -m "fix: address issues found in final verification pass"
```
