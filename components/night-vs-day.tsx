'use client'

import { useMemo } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface NightVsDayProps {
  scrobbles: { scrobbledAt: Date }[]
}

interface HourCounts {
  [hour: number]: number
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am'
  if (hour < 12) return `${hour}am`
  if (hour === 12) return '12pm'
  return `${hour - 12}pm`
}

export function NightVsDay({ scrobbles }: NightVsDayProps) {
  const stats = useMemo(() => {
    const hourCounts: HourCounts = {}
    for (let h = 0; h < 24; h++) hourCounts[h] = 0

    for (const s of scrobbles) {
      const hour = new Date(s.scrobbledAt).getHours()
      hourCounts[hour] = (hourCounts[hour] ?? 0) + 1
    }

    // Day: hours 6–21 (6am up to but not including 10pm = hour 22)
    // Night: hours 22–23 + 0–5
    let dayCount = 0
    let nightCount = 0

    for (let h = 6; h < 22; h++) dayCount += hourCounts[h]
    for (let h = 22; h < 24; h++) nightCount += hourCounts[h]
    for (let h = 0; h < 6; h++) nightCount += hourCounts[h]

    const total = dayCount + nightCount || 1
    const dayPct = Math.round((dayCount / total) * 100)
    const nightPct = 100 - dayPct

    // Peak day hour (6–21)
    let peakDayHour = 6
    let peakDayVal = 0
    for (let h = 6; h < 22; h++) {
      if (hourCounts[h] > peakDayVal) { peakDayVal = hourCounts[h]; peakDayHour = h }
    }

    // Peak night hour (22–23 + 0–5)
    let peakNightHour = 0
    let peakNightVal = 0
    const nightHours = [22, 23, 0, 1, 2, 3, 4, 5]
    for (const h of nightHours) {
      if (hourCounts[h] > peakNightVal) { peakNightVal = hourCounts[h]; peakNightHour = h }
    }

    // Breakdown by time of day
    // Morning: 6–11, Afternoon: 12–17, Evening: 18–21, Night: 22–5
    let morning = 0, afternoon = 0, evening = 0, night = 0
    for (let h = 6; h < 12; h++) morning += hourCounts[h]
    for (let h = 12; h < 18; h++) afternoon += hourCounts[h]
    for (let h = 18; h < 22; h++) evening += hourCounts[h]
    for (let h = 22; h < 24; h++) night += hourCounts[h]
    for (let h = 0; h < 6; h++) night += hourCounts[h]

    const grandTotal = morning + afternoon + evening + night || 1

    return {
      dayPct,
      nightPct,
      peakDayHour,
      peakNightHour,
      morning: Math.round((morning / grandTotal) * 100),
      afternoon: Math.round((afternoon / grandTotal) * 100),
      evening: Math.round((evening / grandTotal) * 100),
      nightBreakdown: Math.round((night / grandTotal) * 100),
    }
  }, [scrobbles])

  const isDay = stats.dayPct >= 50

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          {isDay ? (
            <Sun className="h-4 w-4 text-yellow-500" />
          ) : (
            <Moon className="h-4 w-4 text-blue-400" />
          )}
          Night vs Day
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary label */}
        <p className="text-sm text-[var(--muted-foreground)]">
          You are a{' '}
          <span className="font-semibold text-[var(--foreground)]">
            {isDay ? `${stats.dayPct}% day` : `${stats.nightPct}% night`}
          </span>{' '}
          listener
        </p>

        {/* Split animated bar */}
        <div className="relative h-6 w-full overflow-hidden rounded-full bg-[var(--muted)]">
          {/* Day segment */}
          <div
            className="absolute left-0 top-0 h-full rounded-l-full transition-all duration-700 ease-out"
            style={{
              width: `${stats.dayPct}%`,
              background: 'linear-gradient(90deg, oklch(0.85 0.18 85), oklch(0.78 0.16 65))',
            }}
          />
          {/* Night segment */}
          <div
            className="absolute right-0 top-0 h-full rounded-r-full transition-all duration-700 ease-out"
            style={{
              width: `${stats.nightPct}%`,
              background: 'linear-gradient(90deg, oklch(0.45 0.12 270), oklch(0.35 0.15 260))',
            }}
          />
        </div>

        {/* Day / Night labels below bar */}
        <div className="flex justify-between text-xs">
          <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
            <Sun className="h-3 w-3 text-yellow-500" />
            <span className="font-medium text-[var(--foreground)]">{stats.dayPct}%</span>
            &nbsp;Day
            <span className="ml-1 text-[var(--muted-foreground)]">
              · Busiest at {formatHour(stats.peakDayHour)}
            </span>
          </span>
          <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
            Night
            <span className="font-medium text-[var(--foreground)]">{stats.nightPct}%</span>
            <Moon className="h-3 w-3 text-blue-400" />
            <span className="ml-1 text-[var(--muted-foreground)]">
              · Busiest at {formatHour(stats.peakNightHour)}
            </span>
          </span>
        </div>

        {/* Time-of-day breakdown chips */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Morning', pct: stats.morning, icon: '🌅', sub: '6am–12pm' },
            { label: 'Afternoon', pct: stats.afternoon, icon: '☀️', sub: '12–6pm' },
            { label: 'Evening', pct: stats.evening, icon: '🌆', sub: '6–10pm' },
            { label: 'Night', pct: stats.nightBreakdown, icon: '🌙', sub: '10pm–6am' },
          ].map(({ label, pct, icon, sub }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-3 text-center"
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-base font-bold text-[var(--foreground)]">{pct}%</span>
              <span className="text-xs font-medium text-[var(--foreground)]">{label}</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">{sub}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
