'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface Props {
  scrobbles: { scrobbledAt: Date }[]
}

function buildData(scrobbles: { scrobbledAt: Date }[]) {
  const counts: Record<number, number> = {}

  for (const s of scrobbles) {
    const year = new Date(s.scrobbledAt).getUTCFullYear()
    counts[year] = (counts[year] ?? 0) + 1
  }

  const years = Object.keys(counts)
    .map(Number)
    .sort((a, b) => a - b)

  const rows = years.map((year) => ({ year, count: counts[year] }))

  const peak = rows.reduce(
    (best, row) => (row.count > best.count ? row : best),
    rows[0],
  )

  return { rows, peak }
}

export function PeakYear({ scrobbles }: Props) {
  const result = useMemo(() => {
    if (!scrobbles.length) return null
    return buildData(scrobbles)
  }, [scrobbles])

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Peak Year</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Calendar} title="No scrobble data yet." size="compact" />
        </CardContent>
      </Card>
    )
  }

  const { rows, peak } = result

  return (
    <Card>
      <CardHeader>
        <CardTitle>Peak Year</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your peak year was{' '}
          <span className="font-semibold text-foreground">{peak.year}</span> with{' '}
          <span className="font-semibold text-foreground">
            {peak.count.toLocaleString()}
          </span>{' '}
          scrobbles.
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11 }}
              interval={0}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [typeof value === 'number' ? value.toLocaleString() : (value ?? 0), 'Scrobbles']}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--foreground)',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {rows.map((row) => (
                <Cell
                  key={row.year}
                  fill={
                    row.year === peak.year
                      ? 'var(--primary)'
                      : 'color-mix(in oklch, var(--primary) 35%, transparent)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
