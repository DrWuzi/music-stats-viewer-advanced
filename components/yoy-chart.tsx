'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  scrobbles: { scrobbledAt: Date | string }[]
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const YEAR_COLORS = [
  'hsl(var(--primary))',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
]

function buildData(scrobbles: { scrobbledAt: Date | string }[]) {
  const counts: Record<string, Record<number, number>> = {}

  for (const s of scrobbles) {
    const d = new Date(s.scrobbledAt)
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth() // 0-11
    const key = `${year}-${String(month + 1).padStart(2, '0')}`
    if (!counts[key]) counts[key] = {}
    counts[key][year] = (counts[key][year] ?? 0) + 1
  }

  const years = Array.from(
    new Set(scrobbles.map((s) => new Date(s.scrobbledAt).getUTCFullYear()))
  ).sort()

  const rows = MONTH_NAMES.map((name, idx) => {
    const row: Record<string, number | string> = { month: name }
    for (const year of years) {
      const key = `${year}-${String(idx + 1).padStart(2, '0')}`
      row[String(year)] = counts[key]?.[year] ?? 0
    }
    return row
  })

  return { rows, years }
}

export function YoYChart({ scrobbles }: Props) {
  if (!scrobbles.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Year-over-Year</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No scrobble data yet.</p></CardContent>
      </Card>
    )
  }

  const { rows, years } = buildData(scrobbles)

  return (
    <Card>
      <CardHeader><CardTitle>Year-over-Year</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={rows} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {years.map((year, i) => (
              <Line
                key={year}
                type="monotone"
                dataKey={String(year)}
                stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
