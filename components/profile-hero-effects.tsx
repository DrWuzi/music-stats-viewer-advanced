/**
 * Profile hero animation presets — a decorative, purely-CSS overlay rendered
 * inside the profile hero (see components/profile-banner-live.tsx),
 * user-selectable per profile like Discord's animated profile effects. Pure
 * CSS/SVG (well, plain text glyphs for notes), no canvas/WebGL, so there's no
 * per-frame JS cost. Mirrors the structure of components/profile-backgrounds.tsx
 * and components/avatar-decorations.tsx (types + validator + JSX renderers all
 * in one file).
 */

import type { ReactNode } from 'react'

export type ProfileHeroEffectKey = 'none' | 'sparkle' | 'notes' | 'confetti' | 'glow-pulse' | 'shimmer-sweep'

export const PROFILE_HERO_EFFECT_KEYS: ProfileHeroEffectKey[] = [
  'none',
  'sparkle',
  'notes',
  'confetti',
  'glow-pulse',
  'shimmer-sweep',
]

export const PROFILE_HERO_EFFECT_LABELS: Record<ProfileHeroEffectKey, string> = {
  none: 'None',
  sparkle: 'Sparkle',
  notes: 'Floating Notes',
  confetti: 'Confetti',
  'glow-pulse': 'Glow Pulse',
  'shimmer-sweep': 'Shimmer Sweep',
}

export function isValidProfileHeroEffect(value: unknown): value is ProfileHeroEffectKey {
  return typeof value === 'string' && (PROFILE_HERO_EFFECT_KEYS as string[]).includes(value)
}

const ACCENT = 'var(--profile-accent, var(--primary))'

const SPARKLE_DOTS = [
  { top: '15%', left: '8%', delay: '0s', size: 5 },
  { top: '65%', left: '18%', delay: '0.6s', size: 3 },
  { top: '30%', left: '32%', delay: '1.2s', size: 4 },
  { top: '80%', left: '42%', delay: '0.3s', size: 3 },
  { top: '20%', left: '58%', delay: '1.6s', size: 5 },
  { top: '55%', left: '72%', delay: '0.9s', size: 3 },
  { top: '75%', left: '85%', delay: '1.9s', size: 4 },
  { top: '35%', left: '92%', delay: '0.4s', size: 3 },
]

function Sparkle() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {SPARKLE_DOTS.map((dot, i) => (
        <span
          key={i}
          className="hero-effect-sparkle absolute rounded-full"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            background: ACCENT,
            animationDelay: dot.delay,
            boxShadow: `0 0 6px ${ACCENT}`,
          }}
        />
      ))}
    </div>
  )
}

const NOTE_GLYPHS = ['♪', '♫', '♬']
const NOTES = [
  { left: '6%', delay: '0s', duration: '6s', size: 16 },
  { left: '20%', delay: '1.4s', duration: '7s', size: 12 },
  { left: '38%', delay: '2.6s', duration: '6.5s', size: 18 },
  { left: '55%', delay: '0.8s', duration: '5.5s', size: 14 },
  { left: '72%', delay: '2s', duration: '7.5s', size: 12 },
  { left: '88%', delay: '1.1s', duration: '6s', size: 16 },
]

function Notes() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {NOTES.map((note, i) => (
        <span
          key={i}
          className="hero-effect-note absolute bottom-0 font-bold select-none"
          style={{
            left: note.left,
            fontSize: note.size,
            color: ACCENT,
            animationDelay: note.delay,
            animationDuration: note.duration,
          }}
        >
          {NOTE_GLYPHS[i % NOTE_GLYPHS.length]}
        </span>
      ))}
    </div>
  )
}

const CONFETTI_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-5)', 'var(--chart-7)']
const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 137) % 100}%`,
  delay: `${(i % 7) * 0.5}s`,
  duration: `${4 + (i % 4)}s`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: 4 + (i % 3) * 2,
}))

function Confetti() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="hero-effect-confetti absolute top-0 rounded-sm"
          style={{
            left: c.left,
            width: c.size,
            height: c.size * 1.6,
            background: c.color,
            animationDelay: c.delay,
            animationDuration: c.duration,
          }}
        />
      ))}
    </div>
  )
}

function GlowPulse() {
  return (
    <div
      className="hero-effect-glow absolute rounded-full"
      style={{
        top: '-20%',
        left: '10%',
        width: '60%',
        height: '160%',
        background: `radial-gradient(circle, ${ACCENT} 0%, transparent 70%)`,
      }}
    />
  )
}

function ShimmerSweep() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="hero-effect-shimmer absolute inset-y-0 w-1/3"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }}
      />
    </div>
  )
}

function renderEffect(effect: ProfileHeroEffectKey): ReactNode {
  switch (effect) {
    case 'sparkle':
      return <Sparkle />
    case 'notes':
      return <Notes />
    case 'confetti':
      return <Confetti />
    case 'glow-pulse':
      return <GlowPulse />
    case 'shimmer-sweep':
      return <ShimmerSweep />
    default:
      return null
  }
}

/** Rendered inside the profile hero — above the backdrop art/scrim, below the text content. */
export function ProfileHeroEffectLayer({ effect }: { effect: ProfileHeroEffectKey }) {
  if (effect === 'none') return null
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {renderEffect(effect)}
    </div>
  )
}

/** Small static preview swatch used in the picker. */
export function ProfileHeroEffectPreview({ effect }: { effect: ProfileHeroEffectKey }) {
  if (effect === 'none') {
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
      {renderEffect(effect)}
    </div>
  )
}
