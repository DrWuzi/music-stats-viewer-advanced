'use client'

import { Sun, Sunset, Moon, Star } from 'lucide-react'

interface Scrobble {
  scrobbledAt: Date
  artist: string
}

interface MoodRingProps {
  scrobbles: Scrobble[]
}

interface MoodCategory {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  count: number
}

function getMoodKey(hour: number): string {
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 23) return 'evening'
  return 'night'
}

export function MoodRing({ scrobbles }: MoodRingProps) {
  const counts: Record<string, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  }

  for (const scrobble of scrobbles) {
    const hour = new Date(scrobble.scrobbledAt).getHours()
    counts[getMoodKey(hour)]++
  }

  const total = scrobbles.length || 1

  const moods: MoodCategory[] = [
    {
      key: 'morning',
      label: 'Energized',
      description: 'Morning (6–12)',
      icon: <Sun className="w-6 h-6" />,
      count: counts.morning,
    },
    {
      key: 'afternoon',
      label: 'Focused',
      description: 'Afternoon (12–18)',
      icon: <Sunset className="w-6 h-6" />,
      count: counts.afternoon,
    },
    {
      key: 'evening',
      label: 'Relaxed',
      description: 'Evening (18–23)',
      icon: <Moon className="w-6 h-6" />,
      count: counts.evening,
    },
    {
      key: 'night',
      label: 'Nocturnal',
      description: 'Night (23–6)',
      icon: <Star className="w-6 h-6" />,
      count: counts.night,
    },
  ]

  const dominantKey = moods.reduce((best, mood) =>
    mood.count > best.count ? mood : best
  ).key

  return (
    <div className="grid grid-cols-2 gap-3">
      {moods.map((mood) => {
        const pct = Math.round((mood.count / total) * 100)
        const isDominant = mood.key === dominantKey

        return (
          <div
            key={mood.key}
            className="rounded-xl border p-4 flex flex-col gap-2 transition-colors"
            style={
              isDominant
                ? {
                    borderColor: 'var(--primary)',
                    backgroundColor: 'color-mix(in oklch, var(--primary) 8%, transparent)',
                  }
                : undefined
            }
          >
            <div className="flex items-center gap-2">
              <span
                style={
                  isDominant
                    ? { color: 'var(--primary)' }
                    : { color: 'var(--muted-foreground)' }
                }
              >
                {mood.icon}
              </span>
              <span className="text-xs text-muted-foreground">{mood.description}</span>
            </div>
            <div className="flex items-end justify-between">
              <span
                className="font-semibold text-sm"
                style={isDominant ? { color: 'var(--primary)' } : undefined}
              >
                {mood.label}
              </span>
              <span className="text-2xl font-bold tabular-nums">{pct}%</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {mood.count.toLocaleString()} scrobble{mood.count !== 1 ? 's' : ''}
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: isDominant
                    ? 'var(--primary)'
                    : 'color-mix(in oklch, var(--primary) 40%, transparent)',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
