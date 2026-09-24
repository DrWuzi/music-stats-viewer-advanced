'use client'

import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  scrobbles: { scrobbledAt: Date }[]
  layoutSize?: 1 | 2
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

export function SeasonListening({ scrobbles, layoutSize = 2 }: Props) {
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

  const total = data.reduce((sum, season) => sum + season.count, 0)
  const isCompact = layoutSize === 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Season Listening</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={[
          'grid gap-5 items-center',
          isCompact ? 'grid-cols-1' : 'lg:grid-cols-[minmax(0,1.2fr)_minmax(190px,0.8fr)]',
        ].join(' ')}>
          <div className={[
            'relative mx-auto w-full',
            isCompact ? 'max-w-[18rem]' : 'max-w-[22rem]',
          ].join(' ')}>
            <div className={isCompact ? 'h-56 sm:h-64' : 'h-64 sm:h-72'}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="label"
                    innerRadius="64%"
                    outerRadius="88%"
                    paddingAngle={3}
                    stroke="var(--background)"
                    strokeWidth={2}
                  >
                    {data.map((season) => (
                      <Cell key={season.key} fill={season.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _name, entry) => [
                      `${Number(value).toLocaleString('en-US')} scrobbles`,
                      `${entry?.payload?.icon ?? ''} ${entry?.payload?.label ?? ''}`.trim(),
                    ]}
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: 'var(--foreground)',
                    }}
                    labelStyle={{ color: 'var(--foreground)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="text-3xl font-semibold tabular-nums text-foreground">
                {total.toLocaleString('en-US')}
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                seasonal scrobbles
              </div>
            </div>
          </div>

          <div className={[
            'grid gap-2',
            isCompact ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-1',
          ].join(' ')}>
            {data.map((season) => {
              const isPeak = season.key === peakKey
              return (
                <div
                  key={season.key}
                  className="flex items-center gap-3 rounded-xl border bg-muted/20 px-3 py-2.5"
                  style={{
                    borderColor: isPeak
                      ? 'color-mix(in oklch, var(--primary) 45%, transparent)'
                      : 'var(--border)',
                  }}
                >
                  <span className="text-2xl leading-none">{season.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{season.label}</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {season.pct}%
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{season.count.toLocaleString('en-US')} scrobbles</span>
                      {isPeak && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                          Peak season
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
