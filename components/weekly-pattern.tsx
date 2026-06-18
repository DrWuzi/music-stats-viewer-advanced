'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WeeklyPatternProps {
  scrobbles: { scrobbledAt: Date | string }[]
}

function getWeekdayWeekendCounts(scrobbles: { scrobbledAt: Date | string }[]) {
  // Count distinct weekdays and weekend days in the dataset for averaging
  const weekdayDays = new Set<string>()
  const weekendDays = new Set<string>()
  let weekdayCount = 0
  let weekendCount = 0

  for (const s of scrobbles) {
    const d = new Date(s.scrobbledAt)
    const day = d.getDay() // 0=Sun, 6=Sat
    const dateKey = d.toISOString().slice(0, 10)

    if (day === 0 || day === 6) {
      weekendDays.add(dateKey)
      weekendCount++
    } else {
      weekdayDays.add(dateKey)
      weekdayCount++
    }
  }

  const weekdayDayCount = Math.max(weekdayDays.size, 1)
  const weekendDayCount = Math.max(weekendDays.size, 1)

  const weekdayAvg = Math.round((weekdayCount / weekdayDayCount) * 10) / 10
  const weekendAvg = Math.round((weekendCount / weekendDayCount) * 10) / 10

  return { weekdayAvg, weekendAvg, weekdayDayCount, weekendDayCount }
}

export function WeeklyPattern({ scrobbles }: WeeklyPatternProps) {
  const { weekdayAvg, weekendAvg, summary } = useMemo(() => {
    if (scrobbles.length === 0) return { weekdayAvg: 0, weekendAvg: 0, summary: '' }

    const { weekdayAvg, weekendAvg } = getWeekdayWeekendCounts(scrobbles)

    let summary = ''
    if (weekdayAvg === 0 && weekendAvg === 0) {
      summary = 'Not enough data'
    } else if (weekendAvg > weekdayAvg) {
      const pct =
        weekdayAvg > 0
          ? Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100)
          : 100
      summary = `You listen ${pct}% more on weekends`
    } else if (weekdayAvg > weekendAvg) {
      const pct =
        weekendAvg > 0
          ? Math.round(((weekdayAvg - weekendAvg) / weekendAvg) * 100)
          : 100
      summary = `You listen ${pct}% more on weekdays`
    } else {
      summary = 'You listen equally on weekdays and weekends'
    }

    return { weekdayAvg, weekendAvg, summary }
  }, [scrobbles])

  if (scrobbles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekday vs Weekend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No scrobble data yet.</p>
        </CardContent>
      </Card>
    )
  }

  const data = [
    { name: 'Weekday', avg: weekdayAvg },
    { name: 'Weekend', avg: weekendAvg },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekday vs Weekend</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{summary}</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={true} />
            <Tooltip
              formatter={(value) => [`${value} scrobbles/day`, 'Avg']}
              cursor={{ fill: 'var(--muted)' }}
            />
            <Bar dataKey="avg" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
