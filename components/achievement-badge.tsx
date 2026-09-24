'use client'

import { useMemo } from 'react'
import {
  Star,
  Music,
  Headphones,
  Flame,
  Trophy,
  Zap,
  Heart,
  Clock,
  Disc,
  Radio,
  Lock,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary'

export interface Achievement {
  id: string
  label: string
  description: string
  /** lucide icon name (subset supported) */
  icon: string
  tier: AchievementTier
  earned: boolean
  /** 0-100 */
  progress?: number
  earnedAt?: Date
}

// ---------------------------------------------------------------------------
// Tier config
// ---------------------------------------------------------------------------

const TIER_STYLES: Record<AchievementTier, { bg: string; ring: string; label: string }> = {
  bronze: {
    bg: 'bg-[#cd7f32]',
    ring: 'ring-[#cd7f32]',
    label: 'Bronze',
  },
  silver: {
    bg: 'bg-[#c0c0c0]',
    ring: 'ring-[#c0c0c0]',
    label: 'Silver',
  },
  gold: {
    bg: 'bg-[#ffd700]',
    ring: 'ring-[#ffd700]',
    label: 'Gold',
  },
  platinum: {
    bg: 'bg-[#e5e4e2]',
    ring: 'ring-[#e5e4e2]',
    label: 'Platinum',
  },
  legendary: {
    // rainbow gradient applied inline
    bg: '',
    ring: 'ring-purple-400',
    label: 'Legendary',
  },
}

const SIZE_CONFIG = {
  sm: { outer: 'w-10 h-10', icon: 'w-4 h-4', lock: 'w-3 h-3', text: 'text-[10px]' },
  md: { outer: 'w-14 h-14', icon: 'w-6 h-6', lock: 'w-4 h-4', text: 'text-xs' },
  lg: { outer: 'w-20 h-20', icon: 'w-9 h-9', lock: 'w-5 h-5', text: 'text-sm' },
}

// ---------------------------------------------------------------------------
// Icon resolver (lucide icon name → component)
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  star: Star,
  music: Music,
  headphones: Headphones,
  flame: Flame,
  trophy: Trophy,
  zap: Zap,
  heart: Heart,
  clock: Clock,
  disc: Disc,
  radio: Radio,
}

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name.toLowerCase()] ?? Star
}

// ---------------------------------------------------------------------------
// AchievementBadge
// ---------------------------------------------------------------------------

interface AchievementBadgeProps {
  achievement: Achievement
  size?: 'sm' | 'md' | 'lg'
}

export function AchievementBadge({ achievement, size = 'md' }: AchievementBadgeProps) {
  const { outer, icon: iconSize, lock: lockSize, text } = SIZE_CONFIG[size]
  const tier = TIER_STYLES[achievement.tier]
  const Icon = resolveIcon(achievement.icon)

  const isLegendary = achievement.tier === 'legendary'

  const tooltipLines = [
    achievement.label,
    achievement.description,
    achievement.earned && achievement.earnedAt
      ? `Earned ${achievement.earnedAt.toLocaleDateString('en-US')}`
      : achievement.progress !== undefined
        ? `Progress: ${achievement.progress}%`
        : 'Not yet earned',
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div
      className="relative inline-flex flex-col items-center gap-1 group"
      title={tooltipLines}
    >
      {/* Badge circle */}
      <div
        className={cn(
          'relative rounded-full flex items-center justify-center ring-2 shadow-md transition-transform duration-200 group-hover:scale-110',
          outer,
          !isLegendary && tier.bg,
          tier.ring,
          !achievement.earned && 'grayscale opacity-50',
        )}
        style={
          isLegendary && achievement.earned
            ? {
                background:
                  'conic-gradient(from 0deg, #ff6b6b, #ffd700, #6bff6b, #6bb5ff, #d46bff, #ff6b6b)',
              }
            : isLegendary
              ? { background: '#9ca3af' }
              : undefined
        }
      >
        <Icon
          className={cn(
            iconSize,
            achievement.earned
              ? achievement.tier === 'platinum' || achievement.tier === 'silver'
                ? 'text-gray-700'
                : 'text-white'
              : 'text-gray-400',
          )}
          aria-hidden
        />

        {/* Lock overlay for unearned */}
        {!achievement.earned && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
            <Lock className={cn(lockSize, 'text-white/80')} aria-hidden />
          </span>
        )}

        {/* Progress arc indicator (sm-only skip for clarity) */}
        {!achievement.earned && achievement.progress !== undefined && size !== 'sm' && (
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 36 36"
            aria-hidden
          >
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${(achievement.progress / 100) * 100} 100`}
              pathLength="100"
              className="text-white/60"
            />
          </svg>
        )}
      </div>

      {/* Label (md + lg only) */}
      {size !== 'sm' && (
        <span className={cn('font-medium leading-tight text-center max-w-[5rem] truncate', text)}>
          {achievement.label}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AchievementCard — richer card for grid display
// ---------------------------------------------------------------------------

interface AchievementCardProps {
  achievement: Achievement
}

function AchievementCard({ achievement }: AchievementCardProps) {
  const tier = TIER_STYLES[achievement.tier]
  const Icon = resolveIcon(achievement.icon)
  const isLegendary = achievement.tier === 'legendary'

  return (
    <div
      className={cn(
        'relative rounded-xl border p-4 flex flex-col gap-3 transition-all duration-200',
        'bg-card ring-1 ring-foreground/10 shadow-sm hover:shadow-md',
        !achievement.earned && 'opacity-60',
      )}
    >
      {/* Tier accent line */}
      <div
        className={cn('absolute top-0 left-0 right-0 h-1 rounded-t-xl', !isLegendary && tier.bg)}
        style={
          isLegendary
            ? {
                background:
                  'linear-gradient(90deg, #ff6b6b, #ffd700, #6bff6b, #6bb5ff, #d46bff)',
              }
            : undefined
        }
        aria-hidden
      />

      <div className="flex items-start gap-3 mt-1">
        {/* Icon badge */}
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center ring-2 flex-shrink-0',
            !isLegendary && tier.bg,
            tier.ring,
            !achievement.earned && 'grayscale',
          )}
          style={
            isLegendary && achievement.earned
              ? {
                  background:
                    'conic-gradient(from 0deg, #ff6b6b, #ffd700, #6bff6b, #6bb5ff, #d46bff, #ff6b6b)',
                }
              : isLegendary
                ? { background: '#9ca3af' }
                : undefined
          }
        >
          <Icon
            className={cn(
              'w-5 h-5',
              achievement.tier === 'platinum' || achievement.tier === 'silver'
                ? 'text-gray-700'
                : 'text-white',
              !achievement.earned && 'text-gray-400',
            )}
            aria-hidden
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{achievement.label}</span>
            {!achievement.earned && (
              <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" aria-hidden />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {achievement.description}
          </p>
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded',
            'bg-muted text-muted-foreground',
          )}
        >
          {tier.label}
        </span>

        {achievement.earned && achievement.earnedAt ? (
          <span className="text-[10px] text-muted-foreground">
            {achievement.earnedAt.toLocaleDateString('en-US')}
          </span>
        ) : achievement.progress !== undefined ? (
          <div className="flex items-center gap-1.5 flex-1 max-w-[8rem]">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', !isLegendary && tier.bg)}
                style={{
                  width: `${achievement.progress}%`,
                  ...(isLegendary
                    ? {
                        background:
                          'linear-gradient(90deg, #ff6b6b, #ffd700, #6bff6b, #6bb5ff)',
                      }
                    : {}),
                }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {achievement.progress}%
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AchievementGrid
// ---------------------------------------------------------------------------

interface AchievementGridProps {
  achievements: Achievement[]
}

export function AchievementGrid({ achievements }: AchievementGridProps) {
  const earned = achievements.filter((a) => a.earned)
  const locked = achievements.filter((a) => !a.earned)
  const ordered = [...earned, ...locked]

  return (
    <div className="space-y-4">
      {earned.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {earned.length} of {achievements.length} earned
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ordered.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Derived achievements from profile data
// ---------------------------------------------------------------------------

function deriveAchievements(
  totalScrobbles: number,
  topArtists: { name: string; playcount: number }[],
): Achievement[] {
  const achievements: Achievement[] = []

  // Scrobble milestones
  const scrobbleMilestones: Array<{
    id: string
    label: string
    description: string
    threshold: number
    tier: AchievementTier
  }> = [
    {
      id: 'scrobble_1k',
      label: 'First Thousand',
      description: 'Scrobbled 1,000 tracks',
      threshold: 1000,
      tier: 'bronze',
    },
    {
      id: 'scrobble_10k',
      label: 'Dedicated Listener',
      description: 'Scrobbled 10,000 tracks',
      threshold: 10000,
      tier: 'silver',
    },
    {
      id: 'scrobble_50k',
      label: 'Music Obsessive',
      description: 'Scrobbled 50,000 tracks',
      threshold: 50000,
      tier: 'gold',
    },
    {
      id: 'scrobble_100k',
      label: 'Century Club',
      description: 'Scrobbled 100,000 tracks',
      threshold: 100000,
      tier: 'platinum',
    },
    {
      id: 'scrobble_500k',
      label: 'Legendary Listener',
      description: 'Scrobbled 500,000 tracks',
      threshold: 500000,
      tier: 'legendary',
    },
  ]

  for (const m of scrobbleMilestones) {
    achievements.push({
      id: m.id,
      label: m.label,
      description: m.description,
      icon: 'headphones',
      tier: m.tier,
      earned: totalScrobbles >= m.threshold,
      progress:
        totalScrobbles < m.threshold
          ? Math.min(99, Math.round((totalScrobbles / m.threshold) * 100))
          : undefined,
    })
  }

  // Artist loyalty achievement
  const top1 = topArtists[0]
  if (top1) {
    const loyalThreshold = 500
    achievements.push({
      id: 'artist_loyal',
      label: 'True Fan',
      description: `Play one artist ${loyalThreshold}+ times`,
      icon: 'heart',
      tier: 'gold',
      earned: top1.playcount >= loyalThreshold,
      progress:
        top1.playcount < loyalThreshold
          ? Math.min(99, Math.round((top1.playcount / loyalThreshold) * 100))
          : undefined,
    })
  }

  // Explorer achievement — require breadth
  const uniqueArtistsCount = topArtists.length
  achievements.push({
    id: 'explorer',
    label: 'Explorer',
    description: 'Listen to 20+ different artists in your top list',
    icon: 'music',
    tier: 'silver',
    earned: uniqueArtistsCount >= 20,
    progress:
      uniqueArtistsCount < 20
        ? Math.min(99, Math.round((uniqueArtistsCount / 20) * 100))
        : undefined,
  })

  return achievements
}

// ---------------------------------------------------------------------------
// ProfileBadges
// ---------------------------------------------------------------------------

interface ProfileBadgesProps {
  username: string
  totalScrobbles: number
  topArtists: { name: string; playcount: number }[]
}

export function ProfileBadges({ username: _username, totalScrobbles, topArtists }: ProfileBadgesProps) {
  const achievements = useMemo(
    () => deriveAchievements(totalScrobbles, topArtists),
    [totalScrobbles, topArtists],
  )

  const earnedBadges = achievements.filter((a) => a.earned).slice(0, 5)

  if (earnedBadges.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {earnedBadges.map((achievement) => (
        <AchievementBadge key={achievement.id} achievement={achievement} size="sm" />
      ))}
    </div>
  )
}
