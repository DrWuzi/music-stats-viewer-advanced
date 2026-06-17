'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SyncStatus } from '@/components/sync-status'
import { RecentTracks } from '@/components/recent-tracks'
import { TopLists } from '@/components/top-lists'
import { LovedTracks } from '@/components/loved-tracks'
import { StatsChart } from '@/components/stats-chart'
import type { Period } from '@/lib/lastfm'

interface UserProfileProps {
  username: string
  totalScrobbles: number
  registeredAt: Date
  imageUrl: string
  lastSyncedAt: Date | null
  isOwner: boolean
  recentTracks: { artist: string; album: string | null; track: string; scrobbledAt: Date }[]
  topArtists: Record<Period, { name: string; playcount: number; rank: number }[]>
  topAlbums: Record<Period, { name: string; artist: string; playcount: number; rank: number }[]>
  topTracks: Record<Period, { name: string; artist: string; playcount: number; rank: number }[]>
  lovedTracks: { artist: string; track: string; lovedAt: Date }[]
  allScrobbles: { scrobbledAt: Date }[]
}

export function UserProfile({
  username,
  totalScrobbles,
  registeredAt,
  imageUrl,
  lastSyncedAt,
  isOwner,
  recentTracks,
  topArtists,
  topAlbums,
  topTracks,
  lovedTracks,
  allScrobbles,
}: UserProfileProps) {
  const [period, setPeriod] = useState<Period>('7day')

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-16 w-16">
          <AvatarImage src={imageUrl} alt={username} />
          <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{username}</h1>
          <p className="text-muted-foreground text-sm">
            {totalScrobbles.toLocaleString('en-US')} scrobbles · Member since{' '}
            {new Date(registeredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </p>
        </div>
        <SyncStatus lastSyncedAt={lastSyncedAt} isOwner={isOwner} />
      </div>

      <div className="grid gap-6">
        <StatsChart username={username} scrobbles={allScrobbles} />
        <TopLists
          artists={topArtists[period]}
          albums={topAlbums[period]}
          tracks={topTracks[period]}
          period={period}
          onPeriodChange={setPeriod}
        />
        <div className="grid md:grid-cols-2 gap-6">
          <RecentTracks tracks={recentTracks} />
          <LovedTracks tracks={lovedTracks} />
        </div>
      </div>
    </div>
  )
}
