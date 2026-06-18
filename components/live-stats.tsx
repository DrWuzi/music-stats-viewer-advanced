'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Radio } from 'lucide-react'

interface LiveStatsProps {
  scrobbles: { scrobbledAt: Date }[]
  username: string
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

/** Parse a Last.fm recenttracks response and return scrobbles with dates */
function parseRecentTracks(data: unknown): { scrobbledAt: Date }[] {
  try {
    const tracks = (data as { recenttracks?: { track?: unknown[] } })?.recenttracks?.track
    if (!Array.isArray(tracks)) return []
    return tracks
      .filter((t: unknown) => {
        const track = t as { date?: { uts?: string }; '@attr'?: { nowplaying?: string } }
        return !track['@attr']?.nowplaying && track.date?.uts
      })
      .map((t: unknown) => {
        const track = t as { date: { uts: string } }
        return { scrobbledAt: new Date(parseInt(track.date.uts, 10) * 1000) }
      })
  } catch {
    return []
  }
}

export function LiveStats({ scrobbles: initialScrobbles, username }: LiveStatsProps) {
  const [scrobbles, setScrobbles] = useState<{ scrobbledAt: Date }[]>(initialScrobbles)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!username) return
    setIsRefreshing(true)
    setRefreshError(null)
    try {
      const apiKey = process.env.NEXT_PUBLIC_LASTFM_API_KEY
      if (!apiKey) throw new Error('API key missing')
      const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&limit=200&api_key=${apiKey}&format=json`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const fresh = parseRecentTracks(data)
      if (mountedRef.current && fresh.length > 0) {
        // Merge fresh scrobbles with initial (keep initial for history, update today's)
        setScrobbles((prev) => {
          const freshDates = new Set(fresh.map((s) => s.scrobbledAt.getTime()))
          const merged = [
            ...fresh,
            ...prev.filter((s) => !freshDates.has(new Date(s.scrobbledAt).getTime())),
          ]
          return merged
        })
        setLastRefreshed(new Date())
      }
    } catch (err) {
      if (mountedRef.current) {
        setRefreshError(err instanceof Error ? err.message : 'Failed to refresh')
      }
    } finally {
      if (mountedRef.current) setIsRefreshing(false)
    }
  }, [username])

  useEffect(() => {
    mountedRef.current = true
    const id = setInterval(refresh, 60000)
    return () => {
      mountedRef.current = false
      clearInterval(id)
    }
  }, [refresh])

  const today = todayKey()
  const yesterday = yesterdayKey()
  const todayCount = countForDay(scrobbles, today)
  const yesterdayCount = countForDay(scrobbles, yesterday)
  const scrobblesLast3h = countLastHours(scrobbles, 3)
  const speedPerHour = Math.round(scrobblesLast3h / 3)
  const sinceLastStr = timeSinceLast(scrobbles)
  const projection = projectionForToday(todayCount)
  const diff = todayCount - yesterdayCount
  const diffLabel =
    diff === 0
      ? 'same as yesterday'
      : diff > 0
        ? `+${diff} vs yesterday`
        : `${diff} vs yesterday`

  const refreshedStr = lastRefreshed.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Live Stats</CardTitle>
          <span className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold bg-destructive/10 text-destructive">
            <Radio
              className={`h-3 w-3 ${isRefreshing ? 'opacity-60' : 'animate-pulse'}`}
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
            <p className="text-2xl font-bold leading-none">{todayCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">scrobbles</p>
          </div>

          {/* Scrobbling speed */}
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5">Speed (3h)</p>
            <p className="text-2xl font-bold leading-none">{speedPerHour.toLocaleString()}</p>
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
              {projection.toLocaleString()} today
            </p>
          </div>
        </div>

        {/* Today vs yesterday */}
        <div className="mt-3 rounded-lg border bg-muted/30 px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">vs yesterday ({yesterdayCount.toLocaleString()})</span>
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

        {refreshError ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <div className="flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-xs">Failed to load. Retry?</span>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}>
              Retry
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-2 text-right">
            Updated {refreshedStr} · auto-refreshes every 60s
          </p>
        )}
      </CardContent>
    </Card>
  )
}
