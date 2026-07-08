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
