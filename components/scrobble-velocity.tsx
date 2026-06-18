'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ScrobbleVelocityProps {
  scrobbles: { scrobbledAt: Date | string }[]
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function buildVelocityData(scrobbles: { scrobbledAt: Date | string }[]) {
  if (scrobbles.length === 0) return []

  // Build a day-count map
  const dayMap: Record<string, number> = {}
  for (const s of scrobbles) {
    const key = new Date(s.scrobbledAt).toISOString().slice(0, 10)
    dayMap[key] = (dayMap[key] ?? 0) + 1
  }

  const sortedDays = Object.keys(dayMap).sort()
  if (sortedDays.length === 0) return []

  // Determine date range: from earliest to latest scrobble date
  const start = new Date(sortedDays[0])
  const end = new Date(sortedDays[sortedDays.length - 1])

  // Build ordered list of all dates in range
  const allDays: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    allDays.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }

  // Compute 30-day rolling average for each day
  // Only emit one point per week to keep the chart readable (or sample every N days)
  const WINDOW = 30
  const rawPoints: { date: string; avg: number }[] = []

  for (let i = WINDOW - 1; i < allDays.length; i++) {
    const windowDays = allDays.slice(i - WINDOW + 1, i + 1)
    const total = windowDays.reduce((sum, d) => sum + (dayMap[d] ?? 0), 0)
    rawPoints.push({ date: allDays[i], avg: Math.round((total / WINDOW) * 10) / 10 })
  }

  if (rawPoints.length === 0) return []

  // Downsample: keep ~100 points max for chart clarity
  const step = Math.max(1, Math.floor(rawPoints.length / 100))
  const sampled = rawPoints.filter((_, idx) => idx % step === 0)
  // Always include last point
  const last = rawPoints[rawPoints.length - 1]
  if (sampled[sampled.length - 1]?.date !== last.date) {
    sampled.push(last)
  }

  // Format x-axis labels: show "Mon YYYY" at month boundaries
  return sampled.map((p) => {
    const d = new Date(p.date)
    const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`
    return { date: p.date, label, avg: p.avg }
  })
}

export function ScrobbleVelocity({ scrobbles }: ScrobbleVelocityProps) {
  const data = useMemo(() => buildVelocityData(scrobbles), [scrobbles])

  if (scrobbles.length === 0 || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scrobble Velocity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No scrobble data yet.</p>
        </CardContent>
      </Card>
    )
  }

  // Deduplicate x-axis labels: show label only on first occurrence of each month-year
  const seenLabels = new Set<string>()
  const labeledData = data.map((d) => {
    if (seenLabels.has(d.label)) return { ...d, xLabel: '' }
    seenLabels.add(d.label)
    return { ...d, xLabel: d.label }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scrobble Velocity</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">30-day rolling average · scrobbles/day</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={labeledData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="xLabel"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={40}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={true} />
            <Tooltip
              labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
              formatter={(value) => [`${value} scrobbles/day`, '30-day avg']}
              cursor={{ stroke: 'var(--border)' }}
            />
            <Area
              type="monotone"
              dataKey="avg"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#velocityGradient)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
