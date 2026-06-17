'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value) => [value, 'Scrobbles']}
              cursor={{ fill: 'hsl(var(--muted))' }}
            />
            <Bar
              dataKey="count"
              fill="hsl(var(--primary))"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
