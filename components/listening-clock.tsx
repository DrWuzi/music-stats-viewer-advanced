'use client'

import {
  RadialBarChart,
  RadialBar,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ListeningClock({
  scrobbles,
}: {
  scrobbles: { scrobbledAt: Date | string }[]
}) {
  const counts = new Array(24).fill(0)

  for (const s of scrobbles) {
    const d = new Date(s.scrobbledAt)
    counts[d.getHours()]++
  }

  const data = counts.map((count, hour) => ({
    hour,
    name: `${hour}:00`,
    count,
  }))

  if (!scrobbles.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listening Clock</CardTitle>
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
        <CardTitle>Listening Clock</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <RadialBarChart
            data={data}
            startAngle={90}
            endAngle={-270}
            innerRadius="20%"
            outerRadius="90%"
          >
            <RadialBar
              dataKey="count"
              fill="hsl(var(--primary))"
              background={{ fill: 'hsl(var(--muted))' }}
              label={false}
            />
            <Tooltip
              formatter={(value: number, _name: string, props: { payload?: { name?: string } }) => [
                value,
                props?.payload?.name ?? 'Hour',
              ]}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <p className="text-xs text-center text-muted-foreground mt-1">
          Each band represents one hour (0–23). 12 o'clock = midnight.
        </p>
      </CardContent>
    </Card>
  )
}
