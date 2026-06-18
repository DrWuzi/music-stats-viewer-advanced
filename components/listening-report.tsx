'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Scrobble {
  scrobbledAt: Date
  artist: string
  track: string
}

interface ListeningReportProps {
  scrobbles: Scrobble[]
  period?: '7day' | '30day'
}

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function computeReport(scrobbles: Scrobble[], period: '7day' | '30day') {
  const periodDays = period === '7day' ? 7 : 30
  const now = new Date()

  // Current period: last `periodDays` days (inclusive of today)
  const currentStart = startOfDay(now)
  currentStart.setDate(currentStart.getDate() - (periodDays - 1))

  // Previous period: same span before current period
  const prevStart = startOfDay(now)
  prevStart.setDate(prevStart.getDate() - (periodDays * 2 - 1))
  const prevEnd = new Date(currentStart)
  prevEnd.setDate(prevEnd.getDate() - 1)
  prevEnd.setHours(23, 59, 59, 999)

  const currentScrobbles = scrobbles.filter((s) => new Date(s.scrobbledAt) >= currentStart)
  const prevScrobbles = scrobbles.filter((s) => {
    const t = new Date(s.scrobbledAt)
    return t >= prevStart && t <= prevEnd
  })

  // Total scrobbles
  const totalCurrent = currentScrobbles.length
  const totalPrev = prevScrobbles.length

  // Unique artists
  const uniqueArtistsCurrent = new Set(currentScrobbles.map((s) => s.artist)).size

  // Top artist
  const artistCountsCurrent: Record<string, number> = {}
  for (const s of currentScrobbles) {
    artistCountsCurrent[s.artist] = (artistCountsCurrent[s.artist] ?? 0) + 1
  }
  const topArtist =
    Object.entries(artistCountsCurrent).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  // Top track
  const trackCountsCurrent: Record<string, number> = {}
  for (const s of currentScrobbles) {
    const key = `${s.artist} — ${s.track}`
    trackCountsCurrent[key] = (trackCountsCurrent[key] ?? 0) + 1
  }
  const topTrackEntry = Object.entries(trackCountsCurrent).sort((a, b) => b[1] - a[1])[0]
  const topTrack = topTrackEntry?.[0] ?? '—'

  // Active days
  const activeDaysCurrent = new Set(currentScrobbles.map((s) => isoDate(new Date(s.scrobbledAt)))).size

  // Average per day
  const avgPerDay = totalCurrent / periodDays

  // % change vs previous period
  let pctChange: number | null = null
  if (totalPrev > 0) {
    pctChange = ((totalCurrent - totalPrev) / totalPrev) * 100
  } else if (totalCurrent > 0) {
    pctChange = 100
  }

  // Sparkline: daily counts over the current period
  const dailyMap: Record<string, number> = {}
  const cursor = new Date(currentStart)
  while (cursor <= now) {
    dailyMap[isoDate(cursor)] = 0
    cursor.setDate(cursor.getDate() + 1)
  }
  for (const s of currentScrobbles) {
    const key = isoDate(new Date(s.scrobbledAt))
    if (key in dailyMap) dailyMap[key]++
  }
  const sparklineData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  return {
    totalCurrent,
    uniqueArtistsCurrent,
    topArtist,
    topTrack,
    activeDaysCurrent,
    avgPerDay,
    pctChange,
    sparklineData,
    periodDays,
  }
}

function ChangeIndicator({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">—</span>

  const abs = Math.abs(pct)
  const formatted = `${abs < 1 ? '<1' : Math.round(abs)}%`

  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400">
        <TrendingUp className="h-3 w-3" />
        +{formatted}
      </span>
    )
  }
  if (pct < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-500 dark:text-red-400">
        <TrendingDown className="h-3 w-3" />
        -{formatted}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />
      0%
    </span>
  )
}

export function ListeningReport({ scrobbles, period = '7day' }: ListeningReportProps) {
  const report = useMemo(() => computeReport(scrobbles, period), [scrobbles, period])

  const periodLabel = period === '7day' ? 'This week' : 'This month'
  const prevPeriodLabel = period === '7day' ? 'vs last week' : 'vs last month'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Listening Report</CardTitle>
          <span className="text-xs text-muted-foreground font-medium">{periodLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sparkline */}
        <div className="h-14">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={report.sparklineData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as { date: string; count: number }
                  return (
                    <div className="rounded border bg-card px-2 py-1 text-xs shadow-sm">
                      <span className="text-muted-foreground">{item.date}: </span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  )
                }}
                cursor={false}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--primary)"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: 'var(--primary)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Total scrobbles</p>
            <p className="font-semibold text-base leading-tight mt-0.5">
              {report.totalCurrent.toLocaleString()}
            </p>
            <ChangeIndicator pct={report.pctChange} />
            <p className="text-xs text-muted-foreground mt-0.5">{prevPeriodLabel}</p>
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Unique artists</p>
            <p className="font-semibold text-base leading-tight mt-0.5">
              {report.uniqueArtistsCurrent.toLocaleString()}
            </p>
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 col-span-2">
            <p className="text-xs text-muted-foreground">Top artist</p>
            <p className="font-medium text-sm leading-tight mt-0.5 truncate">{report.topArtist}</p>
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 col-span-2">
            <p className="text-xs text-muted-foreground">Top track</p>
            <p className="font-medium text-sm leading-tight mt-0.5 truncate">{report.topTrack}</p>
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Active days</p>
            <p className="font-semibold text-base leading-tight mt-0.5">
              {report.activeDaysCurrent}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                / {report.periodDays}
              </span>
            </p>
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Avg / day</p>
            <p className="font-semibold text-base leading-tight mt-0.5">
              {report.avgPerDay < 1
                ? report.avgPerDay.toFixed(1)
                : Math.round(report.avgPerDay).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
