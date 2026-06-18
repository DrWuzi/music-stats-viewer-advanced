'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getChartColor } from '@/lib/chart-colors'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// getDay() returns 0=Sun,1=Mon,...,6=Sat → convert to Mon-first index
function toMonFirstDay(jsDay: number): number {
  return (jsDay + 6) % 7
}

export function DayOfWeekChart({
  scrobbles,
}: {
  scrobbles: { scrobbledAt: Date | string }[]
}) {
  const counts = new Array(7).fill(0)

  for (const s of scrobbles) {
    const d = new Date(s.scrobbledAt)
    counts[toMonFirstDay(d.getDay())]++
  }

  const data = DAY_NAMES.map((name, i) => ({ name, count: counts[i] }))

  if (!scrobbles.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>By Day of Week</CardTitle>
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
        <CardTitle>By Day of Week</CardTitle>
      </CardHeader>
      <CardContent>
        <div role="img" aria-label="Bar chart showing scrobble counts by day of week">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'color-mix(in oklch, var(--muted) 60%, transparent)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const entry = payload[0].payload as { name: string; count: number }
                const fullDayNames: Record<string, string> = {
                  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
                  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
                }
                const total = counts.reduce((a, b) => a + b, 0)
                const pct = total > 0 ? Math.round((entry.count / total) * 100) : 0
                return (
                  <div className="bg-popover border border-border rounded-lg p-2 text-sm shadow-md">
                    <span className="font-medium">{fullDayNames[entry.name] ?? entry.name}</span>
                    <span className="text-muted-foreground">: </span>
                    <span>{entry.count.toLocaleString()} scrobbles</span>
                    <span className="text-muted-foreground"> ({pct}% of week)</span>
                  </div>
                )
              }}
            />
            <Bar
              dataKey="count"
              fill={getChartColor(0)}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
