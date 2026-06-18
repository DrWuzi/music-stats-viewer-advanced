'use client'

import { useMemo } from 'react'
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  scrobbles: { scrobbledAt: Date }[]
}

type SeasonKey = 'spring' | 'summer' | 'fall' | 'winter'

interface SeasonInfo {
  key: SeasonKey
  label: string
  icon: string
  months: number[]
  fill: string
}

const SEASONS: SeasonInfo[] = [
  { key: 'spring', label: 'Spring', icon: '🌸', months: [2, 3, 4], fill: 'var(--chart-1)' },
  { key: 'summer', label: 'Summer', icon: '☀️', months: [5, 6, 7], fill: 'var(--chart-2)' },
  { key: 'fall',   label: 'Fall',   icon: '🍂', months: [8, 9, 10], fill: 'var(--chart-3)' },
  { key: 'winter', label: 'Winter', icon: '❄️', months: [11, 0, 1], fill: 'var(--chart-4)' },
]

function getSeason(date: Date): SeasonKey {
  const m = date.getMonth()
  for (const s of SEASONS) {
    if (s.months.includes(m)) return s.key
  }
  return 'winter'
}

export function SeasonListening({ scrobbles }: Props) {
  const data = useMemo(() => {
    const counts: Record<SeasonKey, number> = { spring: 0, summer: 0, fall: 0, winter: 0 }
    for (const s of scrobbles) {
      const key = getSeason(new Date(s.scrobbledAt))
      counts[key]++
    }
    const total = scrobbles.length || 1
    return SEASONS.map((s) => ({
      ...s,
      count: counts[s.key],
      pct: Math.round((counts[s.key] / total) * 100),
    }))
  }, [scrobbles])

  const peakKey = useMemo(
    () => data.reduce((best, s) => (s.count > best.count ? s : best), data[0]).key,
    [data],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Season Listening</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {data.map((season) => {
            const isPeak = season.key === peakKey
            const chartData = [
              { name: season.label, value: season.pct, fill: season.fill },
            ]
            return (
              <div
                key={season.key}
                className="relative rounded-lg border p-3 flex flex-col gap-1"
                style={{
                  borderColor: isPeak
                    ? 'color-mix(in oklch, var(--primary) 60%, transparent)'
                    : 'var(--border)',
                  background: isPeak
                    ? 'color-mix(in oklch, var(--primary) 8%, transparent)'
                    : undefined,
                }}
              >
                {isPeak && (
                  <Badge
                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0 whitespace-nowrap"
                    variant="default"
                  >
                    Peak season
                  </Badge>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xl leading-none">{season.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                    {season.pct}%
                  </span>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {season.label}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {season.count.toLocaleString()} scrobbles
                </p>
                {/* Mini radial bar */}
                <div className="h-12 w-full mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="100%"
                      innerRadius="60%"
                      outerRadius="100%"
                      startAngle={180}
                      endAngle={0}
                      data={chartData}
                      barSize={8}
                    >
                      <RadialBar
                        dataKey="value"
                        background={{ fill: 'color-mix(in oklch, var(--muted) 40%, transparent)' }}
                        cornerRadius={4}
                      />
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(v: any) => [`${v ?? 0}%`, season.label]}
                        contentStyle={{
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontSize: '11px',
                          color: 'var(--foreground)',
                        }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
