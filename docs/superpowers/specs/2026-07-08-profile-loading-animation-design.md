# Profile Custom Loading Animation — Design

## Context

This is the fourth of four Steam-inspired profile customization features requested by the user (custom background, stickers, custom empty panels, custom loading animation) — see `2026-07-08-profile-background-design.md` §Context, which named this as a separate later spec. This one covers only the custom loading animation.

The profile already has a working, DB-persisted, owner-only-editable, visitor-visible customization system: `profileTheme`, `profileTagline`, `avatarDecoration`, `profileBackground`, all editable live via the pencil-icon popover on the profile banner (`components/profile-banner-live.tsx`), persisted through `app/api/profile-customization/route.ts`. This feature extends that same system with a fifth field.

## Goals

- Let a profile owner pick a loading animation that visitors see while `/user/<username>`'s main dashboard data streams in, mirroring the existing persistence/editor model.
- Visible to every visitor of that profile (not just the owner), consistent with theme/background.
- Scoped to the main profile page only (`app/user/[username]/page.tsx`) — not achievements/history/genres/etc. sub-pages.
- Pure Suspense-driven fallback: shows for exactly as long as the page's own data fetching takes, no artificial minimum duration.
- Ship a small, curated, CSS/SVG-only catalog — no uploads.

## Non-goals

- No GIF/Lottie/custom uploads.
- No minimum-duration "splash" behavior — no client-side timer wrapper.
- No effect on `layout.tsx`'s own banner rendering, or on sub-page navigation loading states.

## Data model

One new nullable field on `User`, mirroring the existing four:

```prisma
loadingAnimation String?
```

Values: one of `'none' | 'vinyl' | 'equalizer' | 'soundwave'`. `null`/`'none'` = current behavior — no Suspense fallback UI (fallback renders `null`), i.e. zero visual change for anyone who hasn't opted in.

## Preset catalog

| Key | Description | Motion |
|---|---|---|
| `none` | No custom fallback — renders `null` (default) | — |
| `vinyl` | Rotating vinyl record with tonearm | animated |
| `equalizer` | Pulsing frequency bars, staggered delays (same technique as `.avatar-deco-flicker`) | animated |
| `soundwave` | Expanding circular pulse / soundwave rings (same technique as `.avatar-deco-ripple`) | animated |

All presets render using `currentColor` set to `var(--profile-accent, var(--primary))`, so the loading animation is automatically tinted by whichever accent theme is currently selected — same convention as `profile-backgrounds.tsx` and `avatar-decorations.tsx`.

Animated presets respect `prefers-reduced-motion: reduce` (animation disabled, static shape remains), following the guard pattern introduced in the profile-background spec.

## Rendering architecture

- New `components/profile-loading-animations.tsx`, mirroring `components/avatar-decorations.tsx`'s structure:
  - `LoadingAnimationKey` type, `LOADING_ANIMATION_KEYS`, `LOADING_ANIMATION_LABELS`, `isValidLoadingAnimation()`.
  - `ProfileLoadingAnimation({ preset }: { preset: LoadingAnimationKey })` — the full fallback UI: a centered, `min-h-[50vh]` flex container with the animation plus a small "Loading profile…" caption (`aria-live="polite"`), sized to occupy roughly where the dashboard widgets would appear. Returns `null` when `preset === 'none'`.
  - `ProfileLoadingAnimationPreview({ preset })` — small static preview swatch for the editor picker grid, same visual contract as `AvatarDecorationPreview`/`ProfileBackgroundPreview`.
- New keyframes in `app/globals.css`, namespaced `.profile-loading-*` (vinyl spin, equalizer bar pulse with staggered `animation-delay`, soundwave ripple), added to the existing `@media (prefers-reduced-motion: reduce)` block alongside `.profile-bg-*`.

### Suspense boundary scoped to the main page only

`app/user/[username]/page.tsx` is split into a thin wrapper plus the existing logic moved into an inner async component, so the Suspense boundary wraps *only* this route's own data fetching — not `layout.tsx` (banner data stays synchronous, unaffected) and not sibling routes (`achievements/page.tsx`, `history/page.tsx`, etc. are separate files/segments, untouched):

```tsx
export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const preset = await getLoadingAnimationPreset(username) // single fast `select: { loadingAnimation: true }` lookup
  return (
    <Suspense fallback={<ProfileLoadingAnimation preset={preset} />}>
      <ProfilePageContent username={username} />
    </Suspense>
  )
}

async function ProfilePageContent({ username }: { username: string }) {
  // ...all existing logic from the current default export, unchanged, params replaced by the plain `username` string
}
```

`getLoadingAnimationPreset` is a small helper (co-located in `page.tsx` or `lib/`) doing one indexed `prisma.user.findUnique({ where: { lastfmUsername: username }, select: { loadingAnimation: true } })` — deliberately separate from `ProfilePageContent`'s own heavier `include`-based query, so the wrapper can resolve fast and let the Suspense boundary start streaming before the expensive scrobble/chart queries run. `ProfilePageContent` must be referenced as a JSX element (`<ProfilePageContent ... />`), not awaited directly in the wrapper, so React/Next can suspend and stream it independently.

This is a deliberate departure from Next's `loading.tsx` file convention: `loading.tsx` receives no route params, so it has no way to look up a per-username preset. An explicit in-component `<Suspense>` boundary does, since the wrapper can query the DB before rendering the fallback.

## Editor UI

Extends the existing pencil-icon popover in `components/profile-banner-live.tsx`: a new "Loading animation" section with 4 preview swatches (`none`, `vinyl`, `equalizer`, `soundwave`) in the same grid style as the avatar-decoration/background pickers. New state + `handleLoadingAnimationSelect` handler, new `initialLoadingAnimation` prop, persisted through the same debounced `persist()` call. `handleReset` also resets this field to `'none'`.

## API changes

`app/api/profile-customization/route.ts`: accept an optional `loadingAnimation` field in the POST body, validate via `isValidLoadingAnimation()`, persist alongside the existing four fields. Same allowlist-validation posture — invalid values are silently ignored, never 500.

`app/user/[username]/layout.tsx`: add `loadingAnimation: true` to the existing Prisma `select`, pass `initialLoadingAnimation={user?.loadingAnimation ?? null}` into `ProfileBannerLive`.

## Verification plan

- `npx tsc --noEmit` clean (no new errors beyond the known pre-existing `tests/placeholder.test.ts` failures).
- Update `tests/api/profile-customization.test.ts`, `tests/api/sync.test.ts`, and `tests/lib/sync.test.ts` mock `User` objects to include `loadingAnimation: null`, matching the existing pattern for the other four fields.
- Manually verify: visiting `/user/<username>` where the owner selected a non-`none` preset shows the animation while data loads, and that `achievements`/`history`/etc. sub-pages are unaffected.
- Confirm `prefers-reduced-motion: reduce` disables the vinyl/equalizer/soundwave keyframe animations.
- Full `npx vitest run` (excluding stale `.claude/worktrees/*`) shows no new failures beyond the known pre-existing ones.
- `npx next build` succeeds across all routes.
