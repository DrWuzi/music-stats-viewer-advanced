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
