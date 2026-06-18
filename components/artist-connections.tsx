'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ArtistConnectionsProps {
  scrobbles: { scrobbledAt: Date | string; artist: string }[]
  topArtists: { name: string; playcount: number }[]
}

interface PairEntry {
  label: string
  days: number
  artistA: string
  artistB: string
}

function buildCoOccurrences(
  scrobbles: { scrobbledAt: Date | string; artist: string }[],
  topArtists: { name: string; playcount: number }[],
): PairEntry[] {
  if (scrobbles.length === 0 || topArtists.length === 0) return []

  // Top 20 artists set (lowercased for matching)
  const top20Set = new Set(
    topArtists
      .slice(0, 20)
      .map((a) => a.name.toLowerCase()),
  )

  // Group scrobbles by calendar day
  const dayArtistMap = new Map<string, Set<string>>()
  for (const s of scrobbles) {
    const day = new Date(s.scrobbledAt).toISOString().slice(0, 10)
    const artistLower = s.artist.toLowerCase()
    if (!top20Set.has(artistLower)) continue
    if (!dayArtistMap.has(day)) dayArtistMap.set(day, new Set())
    dayArtistMap.get(day)!.add(artistLower)
  }

  // Build co-occurrence counts
  const pairCounts = new Map<string, number>()
  for (const artists of dayArtistMap.values()) {
    const arr = [...artists].sort()
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = `${arr[i]}|||${arr[j]}`
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
      }
    }
  }

  if (pairCounts.size === 0) return []

  // Build lookup for display names (original casing from topArtists)
  const displayName = new Map<string, string>()
  for (const a of topArtists.slice(0, 20)) {
    displayName.set(a.name.toLowerCase(), a.name)
  }

  // Sort by days descending, take top 10
  const sorted = [...pairCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return sorted.map(([key, days]) => {
    const [aLower, bLower] = key.split('|||')
    const artistA = displayName.get(aLower) ?? aLower
    const artistB = displayName.get(bLower) ?? bLower
    return {
      label: `${artistA} × ${artistB}`,
      days,
      artistA,
      artistB,
    }
  })
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number; payload: PairEntry }[]
  label?: string
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{entry.payload.artistA}</p>
      <p className="font-medium">{entry.payload.artistB}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Shared days: {entry.value}
      </p>
    </div>
  )
}

export function ArtistConnections({ scrobbles, topArtists }: ArtistConnectionsProps) {
  const pairs = useMemo(
    () => buildCoOccurrences(scrobbles, topArtists),
    [scrobbles, topArtists],
  )

  if (pairs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listening Companions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data</p>
        </CardContent>
      </Card>
    )
  }

  // Reverse for bottom-to-top visual ordering in vertical BarChart
  const chartData = [...pairs].reverse()

  // Compute left margin based on longest label
  const longestLabel = pairs.reduce((max, p) => Math.max(max, p.label.length), 0)
  const leftMargin = Math.min(220, Math.max(120, longestLabel * 6))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listening Companions</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Artists most often listened to on the same day · top 20 artists only
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 20, bottom: 4, left: leftMargin }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              label={{ value: 'Shared days', position: 'insideBottom', offset: -2, fontSize: 11, fill: 'currentColor' }}
              height={30}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11 }}
              width={leftMargin}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'color-mix(in oklch, var(--muted) 60%, transparent)' }} />
            <Bar dataKey="days" fill="var(--primary)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
