'use client'

import { useState, useEffect } from 'react'
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
import { CalendarRange } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface Props {
  scrobbles: { scrobbledAt: Date | string }[]
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getCssVar(name: string) {
  if (typeof window === 'undefined') return '#888'
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const YEAR_COLOR_VARS = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--chart-6',
  '--chart-7',
  '--chart-8',
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
  const [resolvedColors, setResolvedColors] = useState<string[]>([])
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    const resolve = () => setResolvedColors(YEAR_COLOR_VARS.map((v) => getCssVar(v)))
    resolve()
    const observer = new MutationObserver(resolve)
    observer.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  if (!scrobbles.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Year-over-Year</CardTitle></CardHeader>
        <CardContent><EmptyState icon={CalendarRange} title="No scrobble data yet." size="compact" /></CardContent>
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--foreground)',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Legend
              onClick={(e) => {
                const key = String(e.dataKey ?? e.value)
                setHiddenKeys((prev) => {
                  const next = new Set(prev)
                  if (next.has(key)) next.delete(key)
                  else next.add(key)
                  return next
                })
              }}
              wrapperStyle={{ cursor: 'pointer' }}
            />
            {years.map((year, i) => (
              <Line
                key={year}
                type="monotone"
                dataKey={String(year)}
                stroke={resolvedColors[i % YEAR_COLOR_VARS.length] ?? getCssVar(YEAR_COLOR_VARS[i % YEAR_COLOR_VARS.length])}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                hide={hiddenKeys.has(String(year))}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
