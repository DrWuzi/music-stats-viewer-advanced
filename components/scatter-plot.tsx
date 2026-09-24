'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { ScatterChart as ScatterChartIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface Props {
  topArtists: { name: string; playcount: number; rank: number }[]
  topTracks: { name: string; artist: string; playcount: number }[]
}

interface ScatterPoint {
  x: number
  y: number
  name: string
  artist: string
}

interface TooltipPayload {
  payload?: ScatterPoint
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null
  const pt = payload[0]?.payload
  if (!pt) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{pt.name}</p>
      <p className="text-muted-foreground">{pt.artist}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Artist plays: {pt.x.toLocaleString('en-US')} · Track plays: {pt.y.toLocaleString('en-US')}
      </p>
    </div>
  )
}

export function ScatterPlot({ topArtists, topTracks }: Props) {
  if (!topArtists.length || !topTracks.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Track vs Artist Plays</CardTitle></CardHeader>
        <CardContent><EmptyState icon={ScatterChartIcon} title="No data available yet." size="compact" /></CardContent>
      </Card>
    )
  }

  const artistMap = new Map(topArtists.map((a) => [a.name.toLowerCase(), a.playcount]))

  const data: ScatterPoint[] = topTracks.map((t) => ({
    x: artistMap.get(t.artist.toLowerCase()) ?? 0,
    y: t.playcount,
    name: t.name,
    artist: t.artist,
  }))

  return (
    <Card>
      <CardHeader><CardTitle>Track vs Artist Plays</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 40, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              type="number"
              dataKey="x"
              name="Artist Total Plays"
              tick={{ fontSize: 11 }}
              label={{ value: 'Artist Plays', position: 'insideBottom', offset: -5, fontSize: 11, fill: 'currentColor' }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Track Plays"
              tick={{ fontSize: 11 }}
              label={{ value: 'Track Plays', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'currentColor' }}
            />
            <ZAxis range={[40, 40]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              data={data}
              fill="var(--primary)"
              fillOpacity={0.7}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <span
            className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: 'color-mix(in oklch, var(--primary) 70%, transparent)' }}
          />
          <span>
            Each dot is a top track. Its horizontal position shows how many total plays its artist has; its vertical position shows how many plays that individual track has. Dots higher and to the right belong to both a popular artist and a frequently replayed song.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
