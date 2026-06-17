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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
        Artist plays: {pt.x.toLocaleString()} · Track plays: {pt.y.toLocaleString()}
      </p>
    </div>
  )
}

export function ScatterPlot({ topArtists, topTracks }: Props) {
  if (!topArtists.length || !topTracks.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Track vs Artist Plays</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No data available yet.</p></CardContent>
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
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              dataKey="x"
              name="Artist Total Plays"
              tick={{ fontSize: 11 }}
              label={{ value: 'Artist Total Plays', position: 'insideBottom', offset: -12, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Track Plays"
              tick={{ fontSize: 11 }}
              label={{ value: 'Track Plays', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11 }}
            />
            <ZAxis range={[40, 40]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              data={data}
              fill="hsl(var(--primary))"
              fillOpacity={0.7}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
