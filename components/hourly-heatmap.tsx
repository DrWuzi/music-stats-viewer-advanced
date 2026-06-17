'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

export function HourlyHeatmap({
  scrobbles,
}: {
  scrobbles: { scrobbledAt: Date | string }[]
}) {
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
          <p className="text-sm text-muted-foreground">No scrobble data yet.</p>
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
        <div className="overflow-x-auto">
          <div className="min-w-[520px]">
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
                    className="flex-1 mx-px"
                    title={`${day} ${hour}:00 — ${counts[dayIdx][hour]} scrobbles`}
                  >
                    <div
                      className={`h-4 rounded-sm bg-primary ${getOpacityClass(counts[dayIdx][hour])}`}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
