'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

// getDay() returns 0=Sun,1=Mon,...,6=Sat
// We want Mon=0,...,Sun=6
function toMonFirstDay(jsDay: number): number {
  return (jsDay + 6) % 7
}

function getOpacityClass(count: number): string {
  if (count === 0) return 'opacity-0'
  if (count <= 2) return 'opacity-20'
  if (count <= 5) return 'opacity-40'
  if (count <= 10) return 'opacity-60'
  if (count <= 20) return 'opacity-80'
  return 'opacity-100'
}

function formatHourRange(hour: number): string {
  const fmt = (h: number) => {
    if (h === 0) return '12 AM'
    if (h === 12) return '12 PM'
    return h < 12 ? `${h} AM` : `${h - 12} PM`
  }
  const next = (hour + 1) % 24
  return `${fmt(hour)} — ${fmt(next)}`
}

export function HourlyHeatmap({
  scrobbles,
}: {
  scrobbles: { scrobbledAt: Date | string }[]
}) {
  const [tooltip, setTooltip] = useState<{
    day: string
    hour: number
    count: number
    x: number
    y: number
  } | null>(null)

  // counts[day][hour]
  const counts: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))

  for (const s of scrobbles) {
    const d = new Date(s.scrobbledAt)
    const day = toMonFirstDay(d.getDay())
    const hour = d.getHours()
    counts[day][hour]++
  }

  if (!scrobbles.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listening Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Clock} title="No scrobble data yet." size="compact" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listening Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          role="img"
          aria-label="Heatmap showing listening activity by hour of day and day of week"
          className="w-full overflow-x-auto relative"
          onMouseLeave={() => setTooltip(null)}
        >
          <div className="min-w-[600px]">
            {/* Hour labels row */}
            <div className="flex mb-1 ml-8">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="flex-1 text-center text-xs text-muted-foreground"
                >
                  {h % 6 === 0 ? h : ''}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {DAYS.map((day, dayIdx) => (
              <div key={day} className="flex items-center mb-1">
                {/* Day initial */}
                <div className="w-8 text-xs text-muted-foreground shrink-0">
                  {day.charAt(0)}
                </div>
                {/* Hour cells */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 mx-px cursor-default"
                    onMouseEnter={(e) => {
                      const rect = (e.currentTarget as HTMLElement)
                        .closest('[role="img"]')
                        ?.getBoundingClientRect()
                      const cellRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setTooltip({
                        day,
                        hour,
                        count: counts[dayIdx][hour],
                        x: cellRect.left - (rect?.left ?? 0) + cellRect.width / 2,
                        y: cellRect.top - (rect?.top ?? 0),
                      })
                    }}
                  >
                    <div
                      className={`h-4 rounded-sm bg-primary ${getOpacityClass(counts[dayIdx][hour])}`}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Floating tooltip */}
          {tooltip && (
            <div
              className="pointer-events-none absolute z-10 bg-popover border border-border rounded-lg p-2 text-sm shadow-md whitespace-nowrap -translate-x-1/2 -translate-y-full"
              style={{ left: tooltip.x, top: tooltip.y - 6 }}
            >
              <span className="font-medium">{tooltip.day}, {formatHourRange(tooltip.hour)}</span>
              <span className="text-muted-foreground">: </span>
              <span>{tooltip.count.toLocaleString('en-US')} scrobbles</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
