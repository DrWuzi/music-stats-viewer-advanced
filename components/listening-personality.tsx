'use client'

import { useMemo } from 'react'
import { Moon, Flame, Calendar, Clock, Music2, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ListeningPersonalityProps {
  topArtists: { name: string; playcount: number }[]
  totalScrobbles: number
  scrobbles: { scrobbledAt: Date }[]
}

type PersonalityType = 'Night Owl' | 'Binge Listener' | 'Daily Devotee' | 'Weekend Warrior' | 'Morning Bird'

interface PersonalityDef {
  type: PersonalityType
  description: string
  icon: React.ElementType
  color: string
}

const PERSONALITIES: Record<PersonalityType, PersonalityDef> = {
  'Night Owl': {
    type: 'Night Owl',
    description: 'You do your best listening after midnight.',
    icon: Moon,
    color: 'var(--primary)',
  },
  'Morning Bird': {
    type: 'Morning Bird',
    description: 'You kick off every day with music.',
    icon: Music2,
    color: 'var(--primary)',
  },
  'Binge Listener': {
    type: 'Binge Listener',
    description: 'When you find something good, you really go for it.',
    icon: Flame,
    color: 'var(--primary)',
  },
  'Daily Devotee': {
    type: 'Daily Devotee',
    description: 'Consistent and committed — music is part of your routine.',
    icon: TrendingUp,
    color: 'var(--primary)',
  },
  'Weekend Warrior': {
    type: 'Weekend Warrior',
    description: 'You save the serious listening for the weekend.',
    icon: Calendar,
    color: 'var(--primary)',
  },
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function analyzeScrobbles(scrobbles: { scrobbledAt: Date }[], totalScrobbles: number) {
  if (scrobbles.length === 0) return null

  const hourCounts = new Array(24).fill(0)
  const dayCounts = new Array(7).fill(0)
  const dateCounts: Record<string, number> = {}

  for (const s of scrobbles) {
    const d = new Date(s.scrobbledAt)
    hourCounts[d.getHours()]++
    dayCounts[d.getDay()]++
    const key = d.toISOString().slice(0, 10)
    dateCounts[key] = (dateCounts[key] ?? 0) + 1
  }

  // Peak hour
  let peakHour = 0
  for (let i = 1; i < 24; i++) {
    if (hourCounts[i] > hourCounts[peakHour]) peakHour = i
  }

  // Most active day of week
  let peakDay = 0
  for (let i = 1; i < 7; i++) {
    if (dayCounts[i] > dayCounts[peakDay]) peakDay = i
  }

  // Average daily scrobbles
  const uniqueDays = Object.keys(dateCounts).length
  const avgDaily = uniqueDays > 0 ? Math.round(totalScrobbles / uniqueDays) : 0

  // Night listens (23–05)
  const nightCount = hourCounts.slice(23).reduce((a, b) => a + b, 0) +
    hourCounts.slice(0, 6).reduce((a, b) => a + b, 0)
  const morningCount = hourCounts.slice(5, 11).reduce((a, b) => a + b, 0)
  const nightPct = scrobbles.length > 0 ? nightCount / scrobbles.length : 0
  const morningPct = scrobbles.length > 0 ? morningCount / scrobbles.length : 0

  // Weekend vs weekday
  const weekendCount = dayCounts[0] + dayCounts[6]
  const weekdayCount = dayCounts.slice(1, 6).reduce((a: number, b: number) => a + b, 0)
  // Normalize: weekend has 2 days, weekdays have 5 days
  const weekendNorm = weekendCount / 2
  const weekdayNorm = weekdayCount / 5
  const weekendRatio = weekendNorm > 0 && weekdayNorm > 0 ? weekendNorm / weekdayNorm : 1

  // Binge: high variance in daily counts (some days very high)
  const dailyValues = Object.values(dateCounts)
  const mean = dailyValues.reduce((a, b) => a + b, 0) / (dailyValues.length || 1)
  const variance = dailyValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (dailyValues.length || 1)
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0 // coefficient of variation

  // Determine personality
  let personality: PersonalityType = 'Daily Devotee'

  if (nightPct > 0.35) {
    personality = 'Night Owl'
  } else if (morningPct > 0.35) {
    personality = 'Morning Bird'
  } else if (cv > 1.2) {
    personality = 'Binge Listener'
  } else if (weekendRatio > 1.5) {
    personality = 'Weekend Warrior'
  } else {
    personality = 'Daily Devotee'
  }

  const peakHourLabel =
    peakHour === 0
      ? '12 AM'
      : peakHour < 12
      ? `${peakHour} AM`
      : peakHour === 12
      ? '12 PM'
      : `${peakHour - 12} PM`

  return {
    personality,
    peakHour: peakHourLabel,
    peakDay: DAY_NAMES[peakDay],
    avgDaily,
    nightPct: Math.round(nightPct * 100),
  }
}

interface StatChipProps {
  icon: React.ElementType
  label: string
  value: string
}

function StatChip({ icon: Icon, label, value }: StatChipProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg border px-3 py-2"
      style={{ background: 'color-mix(in oklch, var(--muted) 60%, transparent)' }}
    >
      <Icon
        className="size-4 shrink-0"
        style={{ color: 'var(--muted-foreground)' }}
      />
      <div className="min-w-0">
        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {label}
        </p>
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
          {value}
        </p>
      </div>
    </div>
  )
}

export function ListeningPersonality({
  topArtists,
  totalScrobbles,
  scrobbles,
}: ListeningPersonalityProps) {
  const analysis = useMemo(
    () => analyzeScrobbles(scrobbles, totalScrobbles),
    [scrobbles, totalScrobbles]
  )

  if (!analysis || scrobbles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listening Personality</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Not enough data to determine your listening personality yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  const def = PERSONALITIES[analysis.personality]
  const PersonalityIcon = def.icon

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listening Personality</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Personality badge + description */}
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{
              background: 'color-mix(in oklch, var(--primary) 15%, transparent)',
            }}
          >
            <PersonalityIcon
              className="size-5"
              style={{ color: 'var(--primary)' }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Badge variant="secondary" className="w-fit text-sm font-semibold px-2.5 py-0.5">
              {analysis.personality}
            </Badge>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {def.description}
            </p>
          </div>
        </div>

        {/* Stat chips */}
        <div className="grid grid-cols-2 gap-2">
          <StatChip
            icon={Clock}
            label="Peak hour"
            value={analysis.peakHour}
          />
          <StatChip
            icon={Calendar}
            label="Most active day"
            value={analysis.peakDay}
          />
          <StatChip
            icon={TrendingUp}
            label="Avg per day"
            value={`${analysis.avgDaily.toLocaleString('en-US')} tracks`}
          />
          <StatChip
            icon={Music2}
            label="Top artist"
            value={topArtists[0]?.name ?? '—'}
          />
        </div>
      </CardContent>
    </Card>
  )
}
