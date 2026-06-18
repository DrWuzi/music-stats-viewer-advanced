'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArtistImage } from '@/components/artist-image'
import type { Period } from '@/lib/lastfm'

const PERIOD_LABELS: Record<string, string> = {
  "7day": "Last 7 Days",
  "1month": "Last Month",
  "3month": "Last 3 Months",
  "6month": "Last 6 Months",
  "12month": "Last Year",
  "overall": "All Time",
}

interface Item {
  name: string
  artist?: string
  playcount: number
  rank: number
}

function List({ items, username }: { items: Item[]; username: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground py-4">No data for this period.</p>
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.rank} className="flex items-center justify-between py-2 px-2 gap-3 rounded-lg transition-colors duration-150 hover:bg-muted/50">
          <span className="text-sm text-muted-foreground w-5 shrink-0 text-right">{item.rank}</span>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-medium truncate">{item.name}</span>
            {item.artist && (
              <Link
                href={`/artist/${encodeURIComponent(item.artist)}?username=${encodeURIComponent(username)}`}
                className="text-sm text-muted-foreground truncate hover:underline hover:text-foreground transition-colors w-fit"
              >
                {item.artist}
              </Link>
            )}
          </div>
          <span className="text-sm text-muted-foreground shrink-0">
            {item.playcount.toLocaleString()} plays
          </span>
        </li>
      ))}
    </ul>
  )
}

function ArtistList({ artists, username }: { artists: { name: string; playcount: number; rank: number }[]; username: string }) {
  const [artistSort, setArtistSort] = useState<'rank' | 'az'>('rank')

  const sortedArtists = artistSort === 'az'
    ? [...artists].sort((a, b) => a.name.localeCompare(b.name))
    : artists

  if (!artists.length) return <p className="text-sm text-muted-foreground py-4">No data for this period.</p>

  return (
    <div>
      <div className="flex gap-1 mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setArtistSort('rank')}
          className={artistSort === 'rank' ? 'font-semibold' : 'font-normal'}
        >
          # Rank
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setArtistSort('az')}
          className={artistSort === 'az' ? 'font-semibold' : 'font-normal'}
        >
          A–Z
        </Button>
      </div>
      <ul className="divide-y">
        {sortedArtists.map((artist) => (
          <li key={artist.name} className="flex items-center justify-between py-2 px-2 gap-3 rounded-lg transition-colors duration-150 hover:bg-muted/50">
            <span className="text-sm text-muted-foreground w-5 shrink-0 text-right">{artist.rank}</span>
            <Link
              href={`/artist/${encodeURIComponent(artist.name)}?username=${encodeURIComponent(username)}`}
              className="flex items-center gap-2 min-w-0 flex-1 group"
            >
              <ArtistImage name={artist.name} size="xs" />
              <span className="font-medium truncate group-hover:underline">{artist.name}</span>
            </Link>
            <span className="text-sm text-muted-foreground shrink-0">
              {artist.playcount.toLocaleString()} plays
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface TopListsProps {
  username: string
  artists: { name: string; playcount: number; rank: number }[]
  albums: { name: string; artist: string; playcount: number; rank: number }[]
  tracks: { name: string; artist: string; playcount: number; rank: number }[]
  period: Period
  onPeriodChange: (p: Period) => void
}

export function TopLists({ username, artists, albums, tracks, period, onPeriodChange }: TopListsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Top Charts</CardTitle>
        <Select value={period} onValueChange={(v) => onPeriodChange(v as Period)}>
          <SelectTrigger className="w-36">
            <SelectValue>{PERIOD_LABELS[period] ?? period}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(PERIOD_LABELS) as [string, string][]).map(([v, l]) => (
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
          <TabsContent value="artists"><ArtistList artists={artists} username={username} /></TabsContent>
          <TabsContent value="albums"><List items={albums} username={username} /></TabsContent>
          <TabsContent value="tracks"><List items={tracks} username={username} /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
