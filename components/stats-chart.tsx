'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function buildData(scrobbles: { scrobbledAt: Date }[]) {
  const counts: Record<string, number> = {}
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    counts[d.toISOString().slice(0, 10)] = 0
  }
  for (const s of scrobbles) {
    const k = s.scrobbledAt.toISOString().slice(0, 10)
    if (k in counts) counts[k]++
  }
  return Object.entries(counts).map(([date, count]) => ({ date: date.slice(5), count }))
}

export function StatsChart({ scrobbles }: { scrobbles: { scrobbledAt: Date }[] }) {
  if (!scrobbles.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Scrobbles</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No scrobble data yet.</p></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Scrobbles (last 30 days)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={buildData(scrobbles)}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
