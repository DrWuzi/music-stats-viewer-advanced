'use client'

import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface ListeningForecastProps {
  scrobbles: { scrobbledAt: Date | string }[]
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function buildForecast(scrobbles: { scrobbledAt: Date | string }[]) {
  if (scrobbles.length === 0) return null

  // Find earliest and latest scrobble dates to determine span
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - 90)

  // Build day-count map for the last 90 days
  const dayCountMap: Record<string, number> = {}
  for (const s of scrobbles) {
    const d = new Date(s.scrobbledAt)
    if (d >= cutoff && d <= now) {
      const key = d.toISOString().slice(0, 10)
      dayCountMap[key] = (dayCountMap[key] ?? 0) + 1
    }
  }

  // Count distinct days with data (even 0-count days count toward span)
  // Determine the actual data span: from oldest scrobble to now
  const allDates = scrobbles.map((s) => new Date(s.scrobbledAt).toISOString().slice(0, 10))
  const oldestDate = allDates.reduce((a, b) => (a < b ? a : b), allDates[0])
  const oldestMs = new Date(oldestDate + 'T12:00:00Z').getTime()
  const nowMs = now.getTime()
  const totalSpanDays = Math.round((nowMs - oldestMs) / (1000 * 60 * 60 * 24))

  if (totalSpanDays < 14) return null

  // Compute average scrobbles per day-of-week over the last 90 days
  // Tally scrobble counts and occurrence counts for each dow
  const dowCounts = new Array(7).fill(0) // total scrobbles on each dow
  const dowOccurrences = new Array(7).fill(0) // how many days of that dow appeared in the 90-day window

  // Walk every day in the 90-day window to count occurrences of each dow
  const cursor = new Date(cutoff)
  while (cursor <= now) {
    const dow = cursor.getDay()
    dowOccurrences[dow]++
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const [dateStr, count] of Object.entries(dayCountMap)) {
    const dow = new Date(dateStr + 'T12:00:00Z').getDay()
    dowCounts[dow] += count
  }

  const dowAvg = dowCounts.map((total, dow) =>
    dowOccurrences[dow] > 0 ? Math.round(total / dowOccurrences[dow]) : 0
  )

  // Project the next 7 calendar days
  const forecast: { label: string; predicted: number; dayName: string }[] = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const dow = d.getDay()
    const dayName = DAY_NAMES_SHORT[dow]
    const month = MONTH_LABELS_SHORT[d.getMonth()]
    const label = `${dayName} ${month} ${d.getDate()}`
    forecast.push({ label, predicted: dowAvg[dow], dayName })
  }

  // Find busiest day
  const busiest = forecast.reduce((best, cur) =>
    cur.predicted >= best.predicted ? cur : best
  )

  return { forecast, busiest }
}

export function ListeningForecast({ scrobbles }: ListeningForecastProps) {
  const result = useMemo(() => buildForecast(scrobbles), [scrobbles])

  if (scrobbles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listening Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={TrendingUp} title="No data available." size="compact" />
        </CardContent>
      </Card>
    )
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listening Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={TrendingUp} title="Not enough data for a forecast" size="compact" />
        </CardContent>
      </Card>
    )
  }

  const { forecast, busiest } = result

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listening Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Predicted scrobbles · next 7 days · based on 90-day day-of-week averages
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={forecast} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={44} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value) => [`${value}`, 'Predicted scrobbles']}
              cursor={{ fill: 'color-mix(in oklch, var(--primary) 10%, transparent)' }}
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--foreground)',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Bar
              dataKey="predicted"
              fill="var(--primary)"
              fillOpacity={0.6}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-3 text-sm text-muted-foreground">
          Your busiest upcoming day:{' '}
          <span className="font-medium text-foreground">
            {busiest.dayName}
          </span>{' '}
          (~{busiest.predicted} expected)
        </p>
      </CardContent>
    </Card>
  )
}
