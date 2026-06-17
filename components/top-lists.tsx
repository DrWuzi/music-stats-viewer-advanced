'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Period } from '@/lib/lastfm'

const PERIOD_LABELS: Record<Period, string> = {
  '7day': '7 days',
  '1month': '1 month',
  '3month': '3 months',
  '6month': '6 months',
  '12month': '12 months',
  overall: 'All time',
}

interface Item {
  name: string
  artist?: string
  playcount: number
  rank: number
}

function List({ items }: { items: Item[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground py-4">No data for this period.</p>
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.rank} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm text-muted-foreground w-5 shrink-0">{item.rank}</span>
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate">{item.name}</span>
              {item.artist && <span className="text-sm text-muted-foreground truncate">{item.artist}</span>}
            </div>
          </div>
          <span className="text-sm text-muted-foreground ml-4 shrink-0">
            {item.playcount.toLocaleString()} plays
          </span>
        </li>
      ))}
    </ul>
  )
}

interface TopListsProps {
  artists: { name: string; playcount: number; rank: number }[]
  albums: { name: string; artist: string; playcount: number; rank: number }[]
  tracks: { name: string; artist: string; playcount: number; rank: number }[]
  period: Period
  onPeriodChange: (p: Period) => void
}

export function TopLists({ artists, albums, tracks, period, onPeriodChange }: TopListsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Top Charts</CardTitle>
        <Select value={period} onValueChange={(v) => onPeriodChange(v as Period)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="artists">
          <TabsList className="mb-4">
            <TabsTrigger value="artists">Artists</TabsTrigger>
            <TabsTrigger value="albums">Albums</TabsTrigger>
            <TabsTrigger value="tracks">Tracks</TabsTrigger>
          </TabsList>
          <TabsContent value="artists"><List items={artists} /></TabsContent>
          <TabsContent value="albums"><List items={albums} /></TabsContent>
          <TabsContent value="tracks"><List items={tracks} /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
