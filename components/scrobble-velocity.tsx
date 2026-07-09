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
import { Gauge } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { TrendDelta } from '@/components/trend-delta'

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

function computeStats(scrobbles: { scrobbledAt: Date | string }[]) {
  if (scrobbles.length === 0) return null

  // Build day-count map
  const dayMap: Record<string, number> = {}
  for (const s of scrobbles) {
    const key = new Date(s.scrobbledAt).toISOString().slice(0, 10)
    dayMap[key] = (dayMap[key] ?? 0) + 1
  }

  const entries = Object.entries(dayMap)
  if (entries.length === 0) return null

  // Peak day
  const [peakDate, peakCount] = entries.reduce(
    (best, curr) => (curr[1] > best[1] ? curr : best),
    entries[0],
  )

  // Overall daily average across all tracked days (span-based)
  const sortedDays = entries.map(([d]) => d).sort()
  const firstDay = new Date(sortedDays[0])
  const lastDay = new Date(sortedDays[sortedDays.length - 1])
  const spanDays = Math.max(
    1,
    Math.round((lastDay.getTime() - firstDay.getTime()) / 86_400_000) + 1,
  )
  const overallAvg = scrobbles.length / spanDays

  // Last 7 days pace
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const last7Count = scrobbles.filter(
    (s) => new Date(s.scrobbledAt) >= sevenDaysAgo,
  ).length
  const last7Avg = last7Count / 7

  return { peakDate, peakCount, overallAvg, last7Avg }
}

export function ScrobbleVelocity({ scrobbles }: ScrobbleVelocityProps) {
  const data = useMemo(() => buildVelocityData(scrobbles), [scrobbles])
  const stats = useMemo(() => computeStats(scrobbles), [scrobbles])

  if (scrobbles.length === 0 || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scrobble Velocity</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Gauge} title="No scrobble data yet." size="compact" />
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

  const peakFormatted = stats?.peakDate
    ? new Date(stats.peakDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scrobble Velocity</CardTitle>
      </CardHeader>
      <CardContent>
        {stats && (
          <div className="grid grid-cols-2 gap-3 mb-4 animate-fade-in">
            {/* Peak day */}
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground mb-0.5">Peak day</p>
              <p className="text-sm font-semibold leading-tight">
                {stats.peakCount.toLocaleString()} scrobbles
              </p>
              <p className="text-xs text-muted-foreground">{peakFormatted}</p>
            </div>

            {/* Current pace */}
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-xs text-muted-foreground mb-0.5">Current pace</p>
              <div className="flex items-center gap-1 mb-0.5">
                <TrendDelta
                  current={stats.last7Avg}
                  previous={stats.overallAvg}
                  label="Last 7 days vs all-time average"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.last7Avg.toFixed(1)} vs {stats.overallAvg.toFixed(1)} avg/day
              </p>
            </div>
          </div>
        )}

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
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--foreground)',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
              itemStyle={{ color: 'var(--foreground)' }}
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
