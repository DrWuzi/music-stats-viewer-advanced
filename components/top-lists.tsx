'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ListMusic } from 'lucide-react'
import { ArtistImage } from '@/components/artist-image'
import { SortMenu } from '@/components/sort-menu'
import { albumHref, artistHref, trackHref } from '@/lib/urls'
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

function List({
  items,
  username,
  type,
  selectedIndex,
  itemRefs,
}: {
  items: Item[]
  username: string
  type: 'album' | 'track'
  selectedIndex: number
  itemRefs: React.MutableRefObject<(HTMLLIElement | null)[]>
}) {
  if (!items.length) return <EmptyState icon={ListMusic} title="No data for this period." size="compact" />
  return (
    <ul className="divide-y">
      {items.map((item, i) => (
        <li
          key={item.rank}
          ref={(el) => { itemRefs.current[i] = el }}
          className={`flex items-center justify-between py-2 px-2 gap-3 rounded-lg transition-colors duration-150 hover:bg-muted/50${
            selectedIndex === i
              ? ' bg-primary/10 ring-1 ring-primary/20'
              : ''
          }`}
        >
          <span className="text-sm text-muted-foreground w-5 shrink-0 text-right">{item.rank}</span>
          <div className="flex flex-col min-w-0 flex-1">
            {item.artist ? (
              <Link
                href={item.artist ? (type === 'album' ? albumHref(item.artist, item.name, username) : trackHref(item.artist, item.name, username)) : '#'}
                className="font-medium truncate hover:underline hover:text-primary transition-colors w-fit max-w-full"
              >
                {item.name}
              </Link>
            ) : (
              <span className="font-medium truncate">{item.name}</span>
            )}
            {item.artist && (
              <Link
                href={artistHref(item.artist, username)}
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

function ArtistList({
  artists,
  username,
  selectedIndex,
  itemRefs,
}: {
  artists: { name: string; playcount: number; rank: number }[]
  username: string
  selectedIndex: number
  itemRefs: React.MutableRefObject<(HTMLLIElement | null)[]>
}) {
  const [artistSort, setArtistSort] = useState<'rank' | 'az'>('rank')

  const sortedArtists = artistSort === 'az'
    ? [...artists].sort((a, b) => a.name.localeCompare(b.name))
    : artists

  if (!artists.length) return <EmptyState icon={ListMusic} title="No data for this period." size="compact" />

  return (
    <div>
      <div className="flex justify-end mb-3">
        <SortMenu
          value={artistSort}
          onChange={(v) => setArtistSort(v as 'rank' | 'az')}
          options={[
            { value: 'rank', label: '# Rank' },
            { value: 'az', label: 'A–Z' },
          ]}
        />
      </div>
      <ul className="divide-y">
        {sortedArtists.map((artist, i) => (
          <li
            key={artist.name}
            ref={(el) => { itemRefs.current[i] = el }}
            className={`flex items-center justify-between py-2 px-2 gap-3 rounded-lg transition-colors duration-150 hover:bg-muted/50${
              selectedIndex === i
                ? ' bg-primary/10 ring-1 ring-primary/20'
                : ''
            }`}
          >
            <span className="text-sm text-muted-foreground w-5 shrink-0 text-right">{artist.rank}</span>
            <Link
              href={artistHref(artist.name, username)}
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

const TAB_VALUES = ['artists', 'albums', 'tracks'] as const
type TabValue = typeof TAB_VALUES[number]

export function TopLists({ username, artists, albums, tracks, period, onPeriodChange }: TopListsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabValue>('artists')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  // Reset selection when tab changes
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as TabValue)
    setSelectedIndex(-1)
    itemRefs.current = []
  }, [])

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  const currentItems = activeTab === 'artists' ? artists : activeTab === 'albums' ? albums : tracks

  const getSelectedHref = useCallback((): string | null => {
    if (selectedIndex < 0) return null
    if (activeTab === 'artists') {
      const artist = artists[selectedIndex]
      return artist ? artistHref(artist.name, username) : null
    }
    if (activeTab === 'albums') {
      const album = albums[selectedIndex]
      return album ? (album.artist ? albumHref(album.artist, album.name, username) : null) : null
    }
    if (activeTab === 'tracks') {
      const track = tracks[selectedIndex]
      return track ? (track.artist ? trackHref(track.artist, track.name, username) : null) : null
    }
    return null
  }, [selectedIndex, activeTab, artists, albums, tracks, username])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const len = currentItems.length

    // Tab switching: 1/2/3
    if (e.key === '1') {
      e.preventDefault()
      setActiveTab('artists')
      setSelectedIndex(-1)
      itemRefs.current = []
      return
    }
    if (e.key === '2') {
      e.preventDefault()
      setActiveTab('albums')
      setSelectedIndex(-1)
      itemRefs.current = []
      return
    }
    if (e.key === '3') {
      e.preventDefault()
      setActiveTab('tracks')
      setSelectedIndex(-1)
      itemRefs.current = []
      return
    }

    // Navigation
    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < len - 1 ? prev + 1 : prev))
      return
    }
    if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
      return
    }

    // Enter: navigate
    if (e.key === 'Enter') {
      e.preventDefault()
      const href = getSelectedHref()
      if (href && href !== '#') {
        router.push(href)
      }
      return
    }
  }, [currentItems.length, getSelectedHref, router])

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
        <div
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-lg"
        >
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="artists">Artists</TabsTrigger>
              <TabsTrigger value="albums">Albums</TabsTrigger>
              <TabsTrigger value="tracks">Tracks</TabsTrigger>
            </TabsList>
            <TabsContent value="artists">
              <ArtistList
                artists={artists}
                username={username}
                selectedIndex={selectedIndex}
                itemRefs={itemRefs}
              />
            </TabsContent>
            <TabsContent value="albums">
              <List
                items={albums}
                username={username}
                type="album"
                selectedIndex={selectedIndex}
                itemRefs={itemRefs}
              />
            </TabsContent>
            <TabsContent value="tracks">
              <List
                items={tracks}
                username={username}
                type="track"
                selectedIndex={selectedIndex}
                itemRefs={itemRefs}
              />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  )
}
