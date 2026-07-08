'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Scrobble {
  scrobbledAt: Date
  artist: string
}

interface Props {
  scrobbles: Scrobble[]
}

export function DiscoveryPace({ scrobbles }: Props) {
  const { chartData, totalUnique, avgNewPerMonth, bestMonth } = useMemo(() => {
    // Build first-heard map for all scrobbles
    const firstHeard = new Map<string, Date>()
    for (const s of scrobbles) {
      const existing = firstHeard.get(s.artist)
      if (!existing || s.scrobbledAt < existing) {
        firstHeard.set(s.artist, s.scrobbledAt)
      }
    }

    const totalUnique = firstHeard.size

    // Build last 12 months list (oldest first)
    const now = new Date()
    const months: { year: number; month: number; label: string; key: string }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth()
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      const key = `${year}-${String(month + 1).padStart(2, '0')}`
      months.push({ year, month, label, key })
    }

    // Count new artists per month (only if first-heard falls within last 12 months)
    const counts = new Map<string, number>()
    for (const m of months) {
      counts.set(m.key, 0)
    }

    const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    for (const [, date] of firstHeard) {
      if (date >= windowStart) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (counts.has(key)) {
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
      }
    }

    const chartData = months.map((m) => ({
      label: m.label,
      key: m.key,
      count: counts.get(m.key) ?? 0,
    }))

    const total = chartData.reduce((sum, d) => sum + d.count, 0)
    const avgNewPerMonth = chartData.length > 0 ? Math.round(total / chartData.length) : 0

    let bestMonth = null as { label: string; count: number } | null
    for (const d of chartData) {
      if (!bestMonth || d.count > bestMonth.count) {
        bestMonth = { label: d.label, count: d.count }
      }
    }

    return { chartData, totalUnique, avgNewPerMonth, bestMonth }
  }, [scrobbles])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discovery Pace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-md bg-muted p-2">
            <div className="text-lg font-semibold">{totalUnique.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Unique Artists</div>
          </div>
          <div className="rounded-md bg-muted p-2">
            <div className="text-lg font-semibold">{avgNewPerMonth}</div>
            <div className="text-xs text-muted-foreground">Avg New / Month</div>
          </div>
          <div className="rounded-md bg-muted p-2">
            <div className="text-lg font-semibold">{bestMonth?.label ?? '—'}</div>
            <div className="text-xs text-muted-foreground">
              Best Month{bestMonth ? ` (${bestMonth.count})` : ''}
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [value ?? 0, 'New Artists']}
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--foreground)',
              }}
              labelStyle={{ color: 'var(--foreground)' }}
              itemStyle={{ color: 'var(--foreground)' }}
            />
            <Bar dataKey="count" fill="var(--primary)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
