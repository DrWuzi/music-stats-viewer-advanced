'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Radio } from 'lucide-react'
import { useNowPlaying } from '@/components/now-playing-context'

interface LiveStatsProps {
  scrobbles: { scrobbledAt: Date | string }[]
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function countForDay(scrobbles: { scrobbledAt: Date | string }[], dayIso: string): number {
  return scrobbles.filter((s) => new Date(s.scrobbledAt).toISOString().slice(0, 10) === dayIso).length
}

/** scrobbles in the last `hours` hours */
function countLastHours(scrobbles: { scrobbledAt: Date | string }[], hours: number): number {
  const cutoff = Date.now() - hours * 3600 * 1000
  return scrobbles.filter((s) => new Date(s.scrobbledAt).getTime() >= cutoff).length
}

function timeSinceLast(scrobbles: { scrobbledAt: Date | string }[]): string | null {
  if (scrobbles.length === 0) return null
  const latest = scrobbles.reduce((best, s) => {
    const t = new Date(s.scrobbledAt).getTime()
    return t > best ? t : best
  }, 0)
  if (latest === 0) return null
  const diffMs = Date.now() - latest
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const h = Math.floor(diffMins / 60)
  const m = diffMins % 60
  if (h < 24) return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`
  const days = Math.floor(h / 24)
  return `${days}d ago`
}

function projectionForToday(todayCount: number): number {
  const now = new Date()
  const minutesPassed = now.getHours() * 60 + now.getMinutes()
  if (minutesPassed === 0) return todayCount
  return Math.round((todayCount / minutesPassed) * 1440)
}

/** Today's scrobbles bucketed by hour, 0-23, for the intraday chart. */
function buildHourlyBuckets(scrobbles: { scrobbledAt: Date | string }[], dayIso: string) {
  const counts = new Array(24).fill(0)
  for (const s of scrobbles) {
    const d = new Date(s.scrobbledAt)
    if (d.toISOString().slice(0, 10) !== dayIso) continue
    counts[d.getHours()]++
  }
  const currentHour = new Date().getHours()
  return counts.map((count, hour) => ({ hour, label: `${hour}:00`, count, isCurrent: hour === currentHour }))
}

export function LiveStats({ scrobbles: initialScrobbles }: LiveStatsProps) {
  const { data, isLoading } = useNowPlaying()

  const scrobbles = useMemo(() => {
    const live = data?.recent ?? []
    if (live.length === 0) return initialScrobbles

    const seen = new Set(
      initialScrobbles.map((s) => new Date(s.scrobbledAt).getTime()),
    )
    const fresh = live
      .map((t) => ({ scrobbledAt: t.scrobbledAt }))
      .filter((t) => !seen.has(new Date(t.scrobbledAt).getTime()))

    if (fresh.length === 0) return initialScrobbles
    return [...fresh, ...initialScrobbles]
  }, [initialScrobbles, data?.recent])

  const today = todayKey()
  const yesterday = yesterdayKey()
  const todayCount = countForDay(scrobbles, today)
  const yesterdayCount = countForDay(scrobbles, yesterday)
  const scrobblesLast3h = countLastHours(scrobbles, 3)
  const speedPerHour = Math.round(scrobblesLast3h / 3)
  const sinceLastStr = timeSinceLast(scrobbles)
  const projection = projectionForToday(todayCount)
  const hourlyData = useMemo(() => buildHourlyBuckets(scrobbles, today), [scrobbles, today])
  const diff = todayCount - yesterdayCount
  const diffLabel =
    diff === 0
      ? 'same as yesterday'
      : diff > 0
        ? `+${diff} vs yesterday`
        : `${diff} vs yesterday`

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Live Stats</CardTitle>
          <span className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold bg-destructive/10 text-destructive">
            <Radio
              className={`h-3 w-3 ${isLoading ? 'opacity-60' : 'animate-pulse'}`}
              aria-hidden
            />
            LIVE
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {/* Today's count */}
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Today</p>
            <p className="text-2xl font-bold leading-none">{todayCount.toLocaleString('en-US')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">scrobbles</p>
          </div>

          {/* Scrobbling speed */}
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Speed (3h)</p>
            <p className="text-2xl font-bold leading-none">{speedPerHour.toLocaleString('en-US')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">scrobbles/hr</p>
          </div>

          {/* Time since last */}
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Last scrobble</p>
            <p className="text-sm font-semibold leading-tight">
              {sinceLastStr ?? '—'}
            </p>
          </div>

          {/* Projection */}
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">On pace for</p>
            <p className="text-sm font-semibold leading-tight">
              {projection.toLocaleString('en-US')} today
            </p>
          </div>
        </div>

        {/* Today's hourly chart */}
        <div className="mt-3 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="hour" hide />
              <YAxis hide />
              <Tooltip
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
                formatter={(value) => [`${value} scrobbles`, '']}
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'var(--foreground)',
                }}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {hourlyData.map((h) => (
                  <Cell key={h.hour} fill={h.isCurrent ? 'var(--primary)' : 'var(--muted-foreground)'} fillOpacity={h.isCurrent ? 1 : 0.35} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Today vs yesterday */}
        <div className="mt-3 rounded-lg border bg-muted/30 px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">vs yesterday ({yesterdayCount.toLocaleString('en-US')})</span>
          <span
            className={`text-xs font-semibold ${
              diff > 0
                ? 'text-green-600 dark:text-green-400'
                : diff < 0
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            }`}
          >
            {diffLabel}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mt-2 text-right">
          auto-refreshes every 22.5s
        </p>
      </CardContent>
    </Card>
  )
}
