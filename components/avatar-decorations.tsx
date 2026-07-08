/**
 * Avatar decorations — small animated overlays rendered around a user's
 * avatar (Discord-style avatar decorations). Pure SVG + CSS keyframe
 * animations (see the .avatar-deco-* classes in app/globals.css) so they
 * render fine from a Server Component and need no client JS.
 *
 * Each decoration is drawn on a 100x100 viewBox that overlays the avatar
 * container 1:1 (place the wrapping element with `absolute inset-0` sized
 * slightly larger than the avatar itself, e.g. `-inset-2`).
 */

export type AvatarDecorationKey =
  | 'none'
  | 'sparkle'
  | 'halo'
  | 'flame'
  | 'crown'
  | 'wreath'
  | 'orbit'
  | 'frost'
  | 'ripple'

export const AVATAR_DECORATION_KEYS: AvatarDecorationKey[] = [
  'none',
  'sparkle',
  'halo',
  'flame',
  'crown',
  'wreath',
  'orbit',
  'frost',
  'ripple',
]

export const AVATAR_DECORATION_LABELS: Record<AvatarDecorationKey, string> = {
  none: 'None',
  sparkle: 'Sparkle',
  halo: 'Halo',
  flame: 'Flame',
  crown: 'Crown',
  wreath: 'Wreath',
  orbit: 'Orbit',
  frost: 'Frost',
  ripple: 'Ripple',
}

export function isValidAvatarDecoration(value: unknown): value is AvatarDecorationKey {
  return typeof value === 'string' && (AVATAR_DECORATION_KEYS as string[]).includes(value)
}

interface DecoProps {
  className?: string
}

const ACCENT = 'var(--profile-accent, var(--primary))'

function Sparkle({ className }: DecoProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ color: ACCENT }} aria-hidden>
      <g fill="currentColor">
        <path
          className="avatar-deco-twinkle"
          style={{ transformOrigin: '86px 14px', animationDelay: '0s' }}
          d="M86 3 L89.5 11 L98 14 L89.5 17 L86 25 L82.5 17 L74 14 L82.5 11 Z"
        />
        <path
          className="avatar-deco-twinkle"
          style={{ transformOrigin: '10px 86px', animationDelay: '0.55s' }}
          d="M10 78 L12.7 84 L19 86 L12.7 88 L10 94 L7.3 88 L1 86 L7.3 84 Z"
        />
        <path
          className="avatar-deco-twinkle"
          style={{ transformOrigin: '92px 62px', animationDelay: '1.1s' }}
          d="M92 56 L94 60.5 L98.5 62 L94 63.5 L92 68 L90 63.5 L85.5 62 L90 60.5 Z"
        />
      </g>
    </svg>
  )
}

function Halo({ className }: DecoProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ color: ACCENT }} aria-hidden>
      {/* transform-origin is the ellipse's own center (50,8), not the SVG's
          center (50,50) — pulsing about the wrong origin drags the ellipse
          toward y=50 as it scales, pushing its top edge past y=0 where the
          SVG's own viewBox clips it. */}
      <g className="avatar-deco-pulse" style={{ transformOrigin: '50px 8px' }}>
        <ellipse
          cx="50"
          cy="8"
          rx="20"
          ry="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>
    </svg>
  )
}

function Flame({ className }: DecoProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ color: ACCENT }} aria-hidden>
      <g fill="currentColor">
        <path
          className="avatar-deco-flicker"
          style={{ transformOrigin: '30px 92px', animationDelay: '0s' }}
          d="M30 78 C 24 84, 24 92, 30 96 C 36 92, 36 84, 30 78 Z"
        />
        <path
          className="avatar-deco-flicker"
          style={{ transformOrigin: '50px 97px', animationDelay: '0.3s' }}
          d="M50 80 C 43 87, 43 96, 50 100 C 57 96, 57 87, 50 80 Z"
        />
        <path
          className="avatar-deco-flicker"
          style={{ transformOrigin: '70px 92px', animationDelay: '0.6s' }}
          d="M70 78 C 64 84, 64 92, 70 96 C 76 92, 76 84, 70 78 Z"
        />
      </g>
    </svg>
  )
}

function Crown({ className }: DecoProps) {
  // Shifted down 8 units from the original drawing (which went as low as
  // y=-2, and further to y=-4 mid-bob) so the crown's jewels stay inside the
  // 0-100 viewBox — SVGs clip to their viewBox by default, so any negative
  // coordinate here was invisible regardless of the avatar container's own
  // overflow setting.
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ color: ACCENT }} aria-hidden>
      <g className="avatar-deco-bob" style={{ transformOrigin: '50px 18px' }}>
        <path
          fill="currentColor"
          d="M28 26 L38 10 L50 22 L62 10 L72 26 L72 30 L28 30 Z"
          stroke="var(--background)"
          strokeWidth="1.5"
        />
        <circle cx="38" cy="10" r="3" fill="currentColor" />
        <circle cx="50" cy="6" r="3.5" fill="currentColor" />
        <circle cx="62" cy="10" r="3" fill="currentColor" />
      </g>
    </svg>
  )
}

function Wreath({ className }: DecoProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ color: ACCENT }} aria-hidden>
      <g fill="currentColor" opacity="0.95">
        {[0, 1, 2, 3].map((i) => (
          <ellipse
            key={`l-${i}`}
            cx={14 + i * 2.5}
            cy={78 - i * 6}
            rx="6"
            ry="3"
            transform={`rotate(${-40 + i * 8} ${14 + i * 2.5} ${78 - i * 6})`}
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <ellipse
            key={`r-${i}`}
            cx={86 - i * 2.5}
            cy={78 - i * 6}
            rx="6"
            ry="3"
            transform={`rotate(${40 - i * 8} ${86 - i * 2.5} ${78 - i * 6})`}
          />
        ))}
      </g>
    </svg>
  )
}

function Orbit({ className }: DecoProps) {
  // The orbiting dot's own radius (4.5) has to fit inside the ring it travels
  // on, not just the ring's centerline — at the old cy="3" (ring r="47") the
  // dot's top edge reached y=-1.5, clipped by the SVG viewBox every time it
  // passed the top of its rotation. The ring/dot orbit radius is now 44 so
  // the dot's bounding circle (max reach 44 + 4.5 = 48.5) stays inside 0-100.
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ color: ACCENT }} aria-hidden>
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.25"
        strokeDasharray="2 4"
      />
      <g className="avatar-deco-spin" style={{ transformOrigin: '50px 50px' }}>
        <circle cx="50" cy="6" r="4.5" fill="currentColor" />
      </g>
    </svg>
  )
}

function Frost({ className }: DecoProps) {
  function Snowflake({ x, y, s, delay }: { x: number; y: number; s: number; delay: string }) {
    return (
      <g
        className="avatar-deco-shimmer"
        style={{ transformOrigin: `${x}px ${y}px`, animationDelay: delay }}
        transform={`translate(${x} ${y}) scale(${s})`}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      >
        <line x1="-5" y1="0" x2="5" y2="0" />
        <line x1="0" y1="-5" x2="0" y2="5" />
        <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" />
        <line x1="-3.5" y1="3.5" x2="3.5" y2="-3.5" />
      </g>
    )
  }
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ color: ACCENT }} aria-hidden>
      <Snowflake x={10} y={14} s={1} delay="0s" />
      <Snowflake x={90} y={20} s={0.8} delay="0.4s" />
      <Snowflake x={6} y={80} s={0.7} delay="0.8s" />
      <Snowflake x={92} y={82} s={1} delay="1.2s" />
    </svg>
  )
}

function Ripple({ className }: DecoProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={{ color: ACCENT }} aria-hidden>
      <circle
        className="avatar-deco-ripple"
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        style={{ animationDelay: '0s' }}
      />
      <circle
        className="avatar-deco-ripple"
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        style={{ animationDelay: '1s' }}
      />
    </svg>
  )
}

export function AvatarDecoration({
  decoration,
  className,
}: {
  decoration: AvatarDecorationKey
  className?: string
}) {
  const cls = `pointer-events-none absolute ${className ?? '-inset-2'}`
  switch (decoration) {
    case 'sparkle':
      return <Sparkle className={cls} />
    case 'halo':
      return <Halo className={cls} />
    case 'flame':
      return <Flame className={cls} />
    case 'crown':
      return <Crown className={cls} />
    case 'wreath':
      return <Wreath className={cls} />
    case 'orbit':
      return <Orbit className={cls} />
    case 'frost':
      return <Frost className={cls} />
    case 'ripple':
      return <Ripple className={cls} />
    default:
      return null
  }
}

/** Small static preview swatch used in pickers (no absolute positioning). */
export function AvatarDecorationPreview({
  decoration,
  size = 40,
}: {
  decoration: AvatarDecorationKey
  size?: number
}) {
  if (decoration === 'none') {
    return (
      <div
        className="rounded-full border border-dashed flex items-center justify-center text-[0.6rem]"
        style={{ width: size, height: size, borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
      >
        —
      </div>
    )
  }
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-[15%] rounded-full"
        style={{ background: 'var(--muted)' }}
      />
      <AvatarDecoration decoration={decoration} className="absolute inset-0" />
    </div>
  )
}
