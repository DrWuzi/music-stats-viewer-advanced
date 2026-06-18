'use client'

import { useMemo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SonicDnaProps {
  scrobbles: { scrobbledAt: Date | string }[]
  topArtists: { name: string; playcount: number }[]
  topTracks: { name: string; artist: string; playcount: number }[]
  totalScrobbles: number
}

interface Metrics {
  Diversity: number
  Loyalty: number
  'Night Owl': number
  Weekend: number
  'Repeat Rate': number
  Explorer: number
  Marathon: number
  'Genre Spread': number
}

function computeMetrics(
  scrobbles: { scrobbledAt: Date | string }[],
  topArtists: { name: string; playcount: number }[],
  topTracks: { name: string; artist: string; playcount: number }[],
  totalScrobbles: number,
): Metrics {
  if (totalScrobbles === 0 || scrobbles.length === 0) {
    return {
      Diversity: 0,
      Loyalty: 0,
      'Night Owl': 0,
      Weekend: 0,
      'Repeat Rate': 0,
      Explorer: 0,
      Marathon: 0,
      'Genre Spread': 0,
    }
  }

  const dates = scrobbles.map((s) => new Date(s.scrobbledAt))

  // --- Diversity ---
  const uniqueArtists = new Set(topArtists.map((a) => a.name.toLowerCase()))
  const diversity = Math.min(100, (uniqueArtists.size / totalScrobbles) * 100)

  // --- Loyalty ---
  const topArtistPlaycount = topArtists[0]?.playcount ?? 0
  const loyalty = Math.min(100, (topArtistPlaycount / totalScrobbles) * 100)

  // --- Night Owl ---
  let nightCount = 0
  for (const d of dates) {
    const h = d.getHours()
    if (h >= 22 || h <= 3) nightCount++
  }
  const nightOwl = Math.min(100, (nightCount / dates.length) * 100)

  // --- Weekend ---
  let weekendCount = 0
  for (const d of dates) {
    const day = d.getDay()
    if (day === 0 || day === 6) weekendCount++
  }
  const weekend = Math.min(100, (weekendCount / dates.length) * 100)

  // --- Repeat Rate ---
  const trackPlayMap = new Map<string, number>()
  for (const t of topTracks) {
    const key = `${t.artist.toLowerCase()}::${t.name.toLowerCase()}`
    trackPlayMap.set(key, t.playcount)
  }
  const uniqueTrackCount = trackPlayMap.size
  const repeatedTracks = [...trackPlayMap.values()].filter((c) => c > 1).length
  const repeatRate = uniqueTrackCount > 0 ? Math.min(100, (repeatedTracks / uniqueTrackCount) * 100) : 0

  // --- Explorer ---
  // Artists only appearing in scrobbles from last 90 days
  const now = Date.now()
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000
  // We only have scrobbledAt, not artist on scrobbles — use topArtists as the universe
  // and detect "recent-only" by checking if any scrobble in last 90d exists (we don't have per-scrobble artist)
  // Instead: use scrobble timestamps to find "recent" listening days count as a proxy for explorer
  // Since scrobble items only have scrobbledAt, we compute: ratio of recent scrobbles to total
  const recentScrobbles = dates.filter((d) => d.getTime() >= ninetyDaysAgo).length
  // Explorer = someone who listened to new things recently vs overall catalogue
  // Use recency ratio as explorer proxy, normalized: if more than 50% of scrobbles are recent, score high
  const recencyRatio = recentScrobbles / dates.length
  // Normalize: 0 means nothing recent, 1 means all recent — map to 0-100
  const explorer = Math.min(100, recencyRatio * 100)

  // --- Marathon ---
  // Sessions: sort dates, gap > 30 min = new session
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime())
  let sessions = 1
  let sessionTracks = 1
  let totalSessionTracks = 1
  const SESSION_GAP_MS = 30 * 60 * 1000
  for (let i = 1; i < sortedDates.length; i++) {
    const gap = sortedDates[i].getTime() - sortedDates[i - 1].getTime()
    if (gap > SESSION_GAP_MS) {
      sessions++
      totalSessionTracks += sessionTracks
      sessionTracks = 1
    } else {
      sessionTracks++
    }
  }
  totalSessionTracks += sessionTracks
  const avgTracksPerSession = sessions > 0 ? totalSessionTracks / sessions : 0
  // Normalize: 20 tracks/session = 100
  const marathon = Math.min(100, (avgTracksPerSession / 20) * 100)

  // --- Genre Spread ---
  // Unique artists in top 50 tracks / 50 * 100
  const top50Tracks = topTracks.slice(0, 50)
  const artistsInTop50 = new Set(top50Tracks.map((t) => t.artist.toLowerCase()))
  const genreSpread = Math.min(100, (artistsInTop50.size / 50) * 100)

  return {
    Diversity: Math.round(diversity),
    Loyalty: Math.round(loyalty),
    'Night Owl': Math.round(nightOwl),
    Weekend: Math.round(weekend),
    'Repeat Rate': Math.round(repeatRate),
    Explorer: Math.round(explorer),
    Marathon: Math.round(marathon),
    'Genre Spread': Math.round(genreSpread),
  }
}

const PERSONALITY_MAP: { key: keyof Metrics; label: string }[] = [
  { key: 'Night Owl', label: 'The Night Owl' },
  { key: 'Loyalty', label: 'The Loyalist' },
  { key: 'Explorer', label: 'The Explorer' },
  { key: 'Marathon', label: 'The Marathon Listener' },
  { key: 'Diversity', label: 'The Eclectic' },
  { key: 'Weekend', label: 'The Weekend Warrior' },
  { key: 'Repeat Rate', label: 'The Devoted Repeater' },
  { key: 'Genre Spread', label: 'The Genre Hopper' },
]

function getPersonality(metrics: Metrics): string {
  let topKey: keyof Metrics = 'Diversity'
  let topScore = -1
  for (const [key, value] of Object.entries(metrics) as [keyof Metrics, number][]) {
    if (value > topScore) {
      topScore = value
      topKey = key
    }
  }
  return PERSONALITY_MAP.find((p) => p.key === topKey)?.label ?? 'The Music Lover'
}

export function SonicDna({ scrobbles, topArtists, topTracks, totalScrobbles }: SonicDnaProps) {
  const metrics = useMemo(
    () => computeMetrics(scrobbles, topArtists, topTracks, totalScrobbles),
    [scrobbles, topArtists, topTracks, totalScrobbles],
  )

  const personality = useMemo(() => getPersonality(metrics), [metrics])

  if (scrobbles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sonic DNA</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  const radarData = (Object.entries(metrics) as [string, number][]).map(([key, value]) => ({
    metric: key,
    value,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sonic DNA</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-2">Your musical fingerprint — 8 dimensions, 0–100</p>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fontSize: 11, fill: 'currentColor' }}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: 'currentColor' }}
              tickCount={4}
              axisLine={false}
            />
            <Radar
              name="You"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="color-mix(in oklch, var(--primary) 30%, transparent)"
            />
            <Tooltip
              formatter={(value) => [`${value}`, '']}
              cursor={false}
            />
          </RadarChart>
        </ResponsiveContainer>
        <div className="mt-3 flex flex-col items-center gap-1">
          <p className="text-xs text-muted-foreground">Your listening personality</p>
          <p className="text-base font-semibold">{personality}</p>
        </div>
      </CardContent>
    </Card>
  )
}
