'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import React from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList, Brush } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmptyState } from '@/components/ui/empty-state'
import { BarChart2 } from 'lucide-react'
import { ChartExportButton } from '@/components/chart-export-button'
import { artistHref, trackHref } from '@/lib/urls'

type DayRange = 30 | 180 | 360
type ViewMode = 'Daily' | 'Weekly' | 'Monthly'
type ZoomPreset = '3m' | '6m' | '1y' | 'all'

// ── data builders ─────────────────────────────────────────────────────────────

function buildDailyData(scrobbles: { scrobbledAt: Date | string }[], days: DayRange) {
  const counts: Record<string, number> = {}
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    counts[d.toISOString().slice(0, 10)] = 0
  }
  for (const s of scrobbles) {
    const k = new Date(s.scrobbledAt).toISOString().slice(0, 10)
    if (k in counts) counts[k]++
  }
  return Object.entries(counts).map(([date, count]) => ({ date, label: date.slice(5), count }))
}

function buildWeeklyData(scrobbles: { scrobbledAt: Date | string }[], days: DayRange) {
  const buckets: Record<string, number> = {}
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - (days - 1))

  for (const s of scrobbles) {
    const d = new Date(s.scrobbledAt)
    if (d < start) continue
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setDate(diff)
    const key = monday.toISOString().slice(0, 10)
    buckets[key] = (buckets[key] ?? 0) + 1
  }

  const cur = new Date(start)
  const dow = cur.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  cur.setDate(cur.getDate() + mondayOffset)

  const result: { date: string; label: string; count: number }[] = []
  while (cur <= now) {
    const key = cur.toISOString().slice(0, 10)
    result.push({ date: key, label: key.slice(5), count: buckets[key] ?? 0 })
    cur.setDate(cur.getDate() + 7)
  }
  return result
}

function buildMonthlyData(scrobbles: { scrobbledAt: Date | string }[], days: DayRange) {
  const buckets: Record<string, number> = {}
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - (days - 1))

  for (const s of scrobbles) {
    const d = new Date(s.scrobbledAt)
    if (d < start) continue
    const key = d.toISOString().slice(0, 7)
    buckets[key] = (buckets[key] ?? 0) + 1
  }

  const result: { date: string; label: string; count: number }[] = []
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cur <= now) {
    const key = cur.toISOString().slice(0, 7)
    result.push({
      date: key,
      label: cur.toLocaleString('en-US', { month: 'short' }),
      count: buckets[key] ?? 0,
    })
    cur.setMonth(cur.getMonth() + 1)
  }
  return result
}

function buildData(
  scrobbles: { scrobbledAt: Date | string }[],
  days: DayRange,
  viewMode: ViewMode,
) {
  if (viewMode === 'Weekly') return buildWeeklyData(scrobbles, days)
  if (viewMode === 'Monthly') return buildMonthlyData(scrobbles, days)
  return buildDailyData(scrobbles, days)
}

function xAxisInterval(days: DayRange, viewMode: ViewMode): number {
  if (viewMode === 'Monthly') return 0
  if (viewMode === 'Weekly') return days === 30 ? 0 : days === 180 ? 3 : 7
  if (days === 30) return 6
  if (days === 180) return 29
  return 59
}

// ── tooltip label formatter ───────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatTooltipLabel(date: string, viewMode: ViewMode): string {
  if (viewMode === 'Monthly') {
    const [year, month] = date.split('-')
    return `${MONTHS[parseInt(month) - 1]} ${year}`
  }
  if (viewMode === 'Weekly') {
    const d = new Date(date + 'T00:00:00')
    return `Week of ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`
  }
  const d = new Date(date + 'T00:00:00')
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} (${DAYS[d.getDay()]})`
}

// ── peak-bar annotation dot ───────────────────────────────────────────────────

function PeakDot(props: {
  x?: number
  y?: number
  width?: number
  value?: number
  peak?: number
}) {
  const { x = 0, y = 0, width = 0, value, peak } = props
  if (!value || value !== peak) return null
  const cx = x + width / 2
  return (
    <g>
      <circle cx={cx} cy={y - 8} r={5} fill="var(--primary)" opacity={0.9} />
      <circle cx={cx} cy={y - 8} r={2.5} fill="white" opacity={0.9} />
    </g>
  )
}

// ── milestone calculations ────────────────────────────────────────────────────

const MILESTONE_THRESHOLDS = [10_000, 50_000, 100_000, 500_000, 1_000_000]

function formatMilestone(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`
  if (n >= 1_000) return `${n / 1_000}k`
  return String(n)
}

/**
 * Given ALL scrobbles (sorted oldest→newest by scrobbledAt), returns a map
 * from YYYY-MM key → array of milestone labels crossed in that month.
 */
function calcMilestoneMonths(
  scrobbles: { scrobbledAt: Date | string }[],
): Map<string, string[]> {
  const sorted = [...scrobbles].sort(
    (a, b) => new Date(a.scrobbledAt).getTime() - new Date(b.scrobbledAt).getTime(),
  )
  const result = new Map<string, string[]>()
  let cumulative = 0
  let nextIdx = 0 // index into MILESTONE_THRESHOLDS

  for (const s of sorted) {
    cumulative++
    while (nextIdx < MILESTONE_THRESHOLDS.length && cumulative >= MILESTONE_THRESHOLDS[nextIdx]) {
      const monthKey = new Date(s.scrobbledAt).toISOString().slice(0, 7)
      const label = formatMilestone(MILESTONE_THRESHOLDS[nextIdx]) + ' ★'
      const existing = result.get(monthKey) ?? []
      result.set(monthKey, [...existing, label])
      nextIdx++
    }
  }
  return result
}

// ── milestone label component (used as ReferenceLine label) ──────────────────

function MilestoneLabel(props: {
  viewBox?: { x?: number; y?: number; width?: number; height?: number }
  value?: string
  isBiggest?: boolean
}) {
  const { viewBox, value, isBiggest } = props
  if (!value && !isBiggest) return null
  const x = (viewBox?.x ?? 0) + (viewBox?.width ?? 0) / 2
  const y = (viewBox?.y ?? 0) - 4
  const text = isBiggest ? '♛' : value ?? ''
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={isBiggest ? 13 : 9}
      fill="var(--primary)"
      style={{ userSelect: 'none', pointerEvents: 'none' }}
    >
      {text}
    </text>
  )
}

// ── helpers ───────────────────────────────────────────────────────────────────

interface DayTrack {
  artist: string
  album: string | null
  track: string
  scrobbledAt: string
}

function topArtist(tracks: DayTrack[]): string {
  const counts: Record<string, number> = {}
  for (const t of tracks) counts[t.artist] = (counts[t.artist] ?? 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
}

// ── component ─────────────────────────────────────────────────────────────────

export function StatsChart({
  username,
  scrobbles,
}: {
  username: string
  scrobbles: { scrobbledAt: Date | string }[]
}) {
  const [days, setDays] = useState<DayRange>(30)
  const [viewMode, setViewMode] = useState<ViewMode>('Daily')
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [dayTracks, setDayTracks] = useState<DayTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [clickSummary, setClickSummary] = useState<string | null>(null)
  const [zoomPreset, setZoomPreset] = useState<ZoomPreset>('all')
  const [brushKey, setBrushKey] = useState(0)
  const chartRef = useRef<HTMLDivElement>(null)

  const allData = useMemo(() => buildData(scrobbles, days, viewMode), [scrobbles, days, viewMode])

  // Slice data for quick zoom presets (no API calls — pure client-side filter)
  const data = useMemo(() => {
    if (zoomPreset === 'all') return allData
    const now = new Date()
    const cutoff = new Date(now)
    if (zoomPreset === '3m') cutoff.setMonth(now.getMonth() - 3)
    else if (zoomPreset === '6m') cutoff.setMonth(now.getMonth() - 6)
    else if (zoomPreset === '1y') cutoff.setFullYear(now.getFullYear() - 1)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return allData.filter((d) => d.date >= cutoffStr)
  }, [allData, zoomPreset])

  const resetZoom = () => {
    setZoomPreset('all')
    setBrushKey((k) => k + 1)
  }

  const peakCount = data.reduce((m, d) => Math.max(m, d.count), 0)

  // Milestone annotations — only meaningful in Monthly view
  const milestoneMonths = useMemo(() => calcMilestoneMonths(scrobbles), [scrobbles])

  // Map from label (short month name) → milestone strings, restricted to visible months
  const milestoneLabelMap = useMemo(() => {
    if (viewMode !== 'Monthly') return new Map<string, string[]>()
    const map = new Map<string, string[]>()
    for (const entry of data) {
      const hits = milestoneMonths.get(entry.date)
      if (hits?.length) map.set(entry.label, hits)
    }
    return map
  }, [data, milestoneMonths, viewMode])

  // Biggest month label in current view
  const biggestMonthLabel = useMemo(() => {
    if (viewMode !== 'Monthly' || peakCount === 0) return null
    return data.find((d) => d.count === peakCount)?.label ?? null
  }, [data, peakCount, viewMode])

  useEffect(() => {
    const handler = (e: Event) => { setDays((e as CustomEvent).detail as DayRange) }
    window.addEventListener('setChartPeriod', handler)
    return () => window.removeEventListener('setChartPeriod', handler)
  }, [])

  const handleBarClick = useCallback(
    async (entry: { date: string; count: number }) => {
      setActiveDate(entry.date)
      setSheetOpen(true)
      setLoading(true)
      setClickSummary(null)

      // For monthly buckets query the first of the month; weekly/daily use the key directly
      const queryDate = entry.date.length === 7 ? entry.date + '-01' : entry.date

      try {
        const res = await fetch(
          `/api/day?username=${encodeURIComponent(username)}&date=${queryDate}`,
        )
        const json = await res.json()
        const tracks: DayTrack[] = json.tracks ?? []
        setDayTracks(tracks)
        const label = formatTooltipLabel(entry.date, viewMode)
        setClickSummary(`${label} — ${entry.count} scrobbles · Top artist: ${topArtist(tracks)}`)
      } finally {
        setLoading(false)
      }
    },
    [username, viewMode],
  )

  if (!scrobbles.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Scrobbles</CardTitle></CardHeader>
        <CardContent>
          <EmptyState icon={BarChart2} title="No scrobble data yet." size="compact" />
        </CardContent>
      </Card>
    )
  }

  const VIEW_MODES: ViewMode[] = ['Daily', 'Weekly', 'Monthly']

  return (
    <>
      <Card className="animate-fade-in-up">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>Scrobbles</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Granularity toggle */}
            <div className="flex gap-1">
              {VIEW_MODES.map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setViewMode(mode); setClickSummary(null) }}
                >
                  {mode}
                </Button>
              ))}
            </div>
            {/* Day-range toggle */}
            <div className="flex gap-1">
              {([30, 180, 360] as DayRange[]).map((d) => (
                <Button
                  key={d}
                  variant={days === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setDays(d); setClickSummary(null) }}
                >
                  {d}d
                </Button>
              ))}
            </div>
            {/* Export button */}
            <ChartExportButton containerRef={chartRef} filename={`${username}-scrobbles-chart`} />
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick zoom filters */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs text-muted-foreground">Zoom:</span>
            <div className="flex gap-1">
              {(['3m', '6m', '1y', 'all'] as ZoomPreset[]).map((preset) => (
                <Button
                  key={preset}
                  variant={zoomPreset === preset ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => { setZoomPreset(preset); setBrushKey((k) => k + 1) }}
                >
                  {preset === 'all' ? 'All' : preset === '1y' ? '1Y' : preset === '6m' ? '6M' : '3M'}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={resetZoom}
            >
              Reset zoom
            </Button>
          </div>

          {/* Inline click summary */}
          {clickSummary && (
            <p className="text-xs text-muted-foreground mb-2 px-2 py-1 rounded bg-muted/50 truncate">
              {clickSummary}
            </p>
          )}

          <div
            ref={chartRef}
            role="img"
            aria-label={`Bar chart showing ${viewMode.toLowerCase()} scrobble counts over the last ${days} days`}
          >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} style={{ cursor: 'pointer' }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval={xAxisInterval(days, viewMode)}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                labelFormatter={(_, payload) => {
                  const date = payload?.[0]?.payload?.date
                  if (!date) return ''
                  return formatTooltipLabel(date, viewMode)
                }}
                formatter={(value) => [value, 'Scrobbles']}
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
                dataKey="count"
                radius={[2, 2, 0, 0]}
                cursor="pointer"
                onClick={(d) => handleBarClick(d as unknown as { date: string; count: number })}
              >
                {/* Peak annotation */}
                <LabelList
                  dataKey="count"
                  content={(props) => (
                    <PeakDot
                      {...(props as { x?: number; y?: number; width?: number; value?: number })}
                      peak={peakCount}
                    />
                  )}
                />
                {data.map((entry) => (
                  <Cell
                    key={entry.date}
                    fill="var(--primary)"
                    fillOpacity={entry.date === activeDate ? 0.65 : 1}
                  />
                ))}
              </Bar>
              {/* Date range brush for drag-to-zoom */}
              <Brush
                key={brushKey}
                dataKey="label"
                height={20}
                stroke="var(--border)"
                fill="var(--card)"
                travellerWidth={6}
              />
              {/* Week boundary lines in Daily mode */}
              {viewMode === 'Daily' && days > 30 && (() => {
                const weekBoundaries = data
                  .filter((_, i) => i > 0 && i % 7 === 0)
                  .map((d) => d.label)
                return weekBoundaries.map((label) =>
                  React.createElement(ReferenceLine, {
                    key: label,
                    x: label,
                    stroke: 'var(--border)',
                    strokeDasharray: '3 3',
                  }),
                )
              })()}
              {/* Milestone annotations in Monthly mode */}
              {viewMode === 'Monthly' && Array.from(milestoneLabelMap.entries()).map(([label, hits]) => {
                const hitText = hits.join(' · ')
                return React.createElement(ReferenceLine, {
                  key: `milestone-${label}`,
                  x: label,
                  stroke: 'var(--primary)',
                  strokeDasharray: '3 3',
                  strokeOpacity: 0.6,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label: { content: (p: any) => React.createElement(MilestoneLabel, { ...p, value: hitText }) } as any,
                })
              })}
              {/* Biggest month crown */}
              {viewMode === 'Monthly' && biggestMonthLabel && !milestoneLabelMap.has(biggestMonthLabel) &&
                React.createElement(ReferenceLine, {
                  key: 'biggest-month',
                  x: biggestMonthLabel,
                  stroke: 'var(--primary)',
                  strokeDasharray: '4 2',
                  strokeOpacity: 0.5,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label: { content: (p: any) => React.createElement(MilestoneLabel, { ...p, isBiggest: true }) } as any,
                })
              }
            </BarChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {activeDate ? formatTooltipLabel(activeDate, viewMode) : ''}
            </SheetTitle>
          </SheetHeader>
          {loading ? (
            <p className="text-sm text-muted-foreground mt-4">Loading…</p>
          ) : dayTracks.length === 0 ? (
            <EmptyState icon={BarChart2} title="No scrobbles on this day." size="compact" />
          ) : (
            <div className="mt-4 space-y-1">
              <p className="text-xs text-muted-foreground mb-3">
                {dayTracks.length} scrobbles · Top artist:{' '}
                {(() => {
                  const name = topArtist(dayTracks)
                  return name === '—' ? (
                    name
                  ) : (
                    <Link
                      href={artistHref(name, username)}
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {name}
                    </Link>
                  )
                })()}
              </p>
              {dayTracks.map((t, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      <Link
                        href={trackHref(t.artist, t.track, username)}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {t.track}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      <Link
                        href={artistHref(t.artist, username)}
                        className="hover:underline hover:text-primary transition-colors"
                      >
                        {t.artist}
                      </Link>
                      {t.album ? ` · ${t.album}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
                    {new Date(t.scrobbledAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
