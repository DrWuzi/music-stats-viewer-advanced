# Profile Custom Background — Design

## Context

This is the first of four Steam-inspired profile customization features requested by the user (custom background, stickers, custom empty panels, custom loading animation). Those other three are separate, later specs — this one covers only the custom background.

The profile already has a working, DB-persisted, owner-only, visitor-visible customization system: `profileTheme` (8 accent color presets), `profileTagline` (60-char text), and `avatarDecoration` (8 animated SVG overlays), all editable live via a pencil-icon popover on the profile banner (`components/profile-banner-live.tsx`), persisted through `app/api/profile-customization/route.ts`. This feature extends that same system with a fourth field.

## Goals

- Let a profile owner pick a decorative background pattern for their entire profile page (banner + all sub-pages: History, Achievements, Wrapped, Reports, Concerts), visible to every visitor — mirroring the existing accent-theme persistence model.
- Match the accent color already chosen, so pattern and color can never clash.
- Ship a small, curated, CSS-only catalog rather than open-ended user uploads (no storage infrastructure, no moderation surface).

## Non-goals

- No image upload or arbitrary URL backgrounds.
- No per-sub-page background overrides (one choice applies everywhere).
- No canvas/WebGL — CSS/SVG animation only.

## Data model

One new nullable field on `User`, mirroring the existing three:

```prisma
profileBackground String?
```

Values: one of `'none' | 'aurora' | 'particles' | 'grid' | 'waves' | 'glow' | 'constellation'`. `null`/`'none'` = current plain look (default, no behavior change for existing users).

## Pattern catalog

| Key | Description | Motion |
|---|---|---|
| `none` | Current plain look (default) | — |
| `aurora` | Slow drifting soft gradient blobs | animated |
| `particles` | Sparse floating dots drifting upward | animated |
| `grid` | Faint perspective grid fading into the distance | static |
| `waves` | Layered translucent wave shapes along the bottom | static |
| `glow` | Soft radial glow pulsing from one corner | animated |
| `constellation` | Faint connected dot-lines, like a star chart | static |

All patterns render using `currentColor` set to `var(--profile-accent, var(--primary))` — the same CSS custom property the accent theme system already sets — so the background is automatically tinted by whichever accent theme (crimson, dracula, etc.) is currently selected. No separate color picker.

All animated patterns are wrapped in `@media (prefers-reduced-motion: no-preference)`. Note: no animation in this codebase currently respects `prefers-reduced-motion` (including the existing `.avatar-deco-*` animations) — this feature is the first to add that guard, not a continuation of an existing posture. Retrofitting the avatar decorations is worth doing but is out of scope for this spec.

## Rendering architecture

- New `lib/profile-backgrounds.ts`: `ProfileBackgroundKey` type, `PROFILE_BACKGROUND_KEYS`, `PROFILE_BACKGROUND_LABELS`, `isValidProfileBackground()` — mirrors the `KEYS`/`LABELS` split used in `components/avatar-decorations.tsx` (not `lib/profile-themes.ts`, which keeps labels inline per-preset).
- New `components/profile-backgrounds.tsx`: `ProfileBackgroundLayer({ pattern }: { pattern: ProfileBackgroundKey })` — the actual SVG/CSS renderers per pattern, mirrors `components/avatar-decorations.tsx`'s structure (one function per pattern + a switch-based dispatcher).
- Rendered as `position: fixed; inset: 0; z-index: -1; pointer-events-none; aria-hidden` from within `components/profile-banner-live.tsx`, alongside its existing `<style>` accent-var injection. `position: fixed` positions relative to the viewport regardless of DOM ancestry as long as no ancestor establishes a new containing block (`transform`/`filter`/`contain`/`will-change: transform`) — confirmed none of `.profile-theme-scope`, the `max-w-[...]` container, or any ancestor between here and `<body>` set any of those properties.
- **Painting-order fix required in the root layout.** A `z-index: -1` descendant paints *before* ordinary in-flow, non-positioned boxes in the same stacking context (CSS2.1 painting order: background of the stacking-context root → negative-z-index descendants → in-flow non-positioned descendants). `<main>` in `app/layout.tsx` currently sets its own opaque `bg-background` — an in-flow, non-positioned box — which would paint *after*, and therefore completely hide, our negative-z-index layer. Fix: remove `bg-background` from `<main>` in `app/layout.tsx`. This is safe and has zero visual effect on any existing page, since `<body>` already applies the identical `bg-background` (via the `@layer base` rule in `app/globals.css`) one level up the tree, painting even earlier (as the stacking-context root's own background, step 1) — `<main>`'s copy is currently pure redundancy. Removing it is what lets the negative-z-index layer become visible through the gaps on profile pages, while every other route keeps the exact same rendered background it has today via `<body>`.
- Because every widget already renders inside an opaque `Card` (`bg-card`), the pattern is only ever visible in the gaps/margins around content — no blur/scrim layer is needed for readability.
- New keyframes added to `app/globals.css` alongside the existing `.avatar-deco-*` animations, namespaced `.profile-bg-*`.

## Print safety

This app has had print-stylesheet regressions twice already this session (both traced to new decorative layers interacting badly with the print CSS). The existing `@media print` block forces `opacity: 1 !important` on `*, *::before, *::after` — which would make a deliberately low-opacity decorative background render at full strength on a printed page. To avoid a third regression, the new background layer gets an explicit, hard rule inside that same `@media print` block:

```css
.profile-bg-layer { display: none !important; }
```

This is a deliberate, targeted kill — not reliance on the generic universal override — because the failure mode here (a layer becoming *more* visible under the "force everything opaque" rule, rather than disappearing) is the opposite of the previous two regressions and needs its own explicit guard.

## Editor UI

Extends the existing pencil-icon popover in `components/profile-banner-live.tsx`: a new "Background" section with 7 small preview swatches in the same visual style as the existing theme-color and avatar-decoration pickers, live-previewed instantly on click (updates local state → the fixed background layer re-renders immediately), debounce-persisted through the same `/api/profile-customization` POST.

## API changes

`app/api/profile-customization/route.ts`: accept an optional `profileBackground` field in the POST body, validate via `isValidProfileBackground()`, persist alongside the existing three fields. Same allowlist-validation posture as `profileTheme`/`avatarDecoration` — invalid values are silently ignored, never 500.

`app/user/[username]/layout.tsx`: add `profileBackground: true` to the existing Prisma `select`, pass `initialBackground={user?.profileBackground ?? null}` into `ProfileBannerLive`.

## Verification plan

- `npx tsc --noEmit` clean (no new errors beyond the known pre-existing `tests/placeholder.test.ts` failures).
- After removing `bg-background` from `<main>` in `app/layout.tsx`, spot-check 2-3 non-profile routes (home, charts, settings) to confirm their rendered background is visually unchanged (should be, since `<body>` already provides it).
- Explicit trace of the print CSS cascade confirming `.profile-bg-layer` resolves to `display: none` under `@media print`, not just opacity/color overrides.
- Confirm `prefers-reduced-motion: reduce` disables the aurora/particles/glow keyframe animations (grid/waves/constellation are static already).
- Update `tests/api/sync.test.ts` and `tests/lib/sync.test.ts` mock `User` objects to include `profileBackground: null`, matching the existing pattern for `profileTheme`/`profileTagline`/`avatarDecoration`.
- Full `npx vitest run` (excluding stale `.claude/worktrees/*`) shows no new failures beyond the 3 known pre-existing ones.
- `npx next build` succeeds across all routes.
