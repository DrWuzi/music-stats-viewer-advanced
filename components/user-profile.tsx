'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SyncStatus } from '@/components/sync-status'
import { RecentTracks } from '@/components/recent-tracks'
import { TopLists } from '@/components/top-lists'
import { LovedTracks } from '@/components/loved-tracks'
import { StatsChart } from '@/components/stats-chart'
import { NowPlaying } from '@/components/now-playing'
import { HourlyHeatmap } from '@/components/hourly-heatmap'
import { DayOfWeekChart } from '@/components/day-of-week-chart'
import { ListeningClock } from '@/components/listening-clock'
import { ListeningStreaks } from '@/components/listening-streaks'
import { ListeningSessions } from '@/components/listening-sessions'
import { Milestones } from '@/components/milestones'
import { NewDiscoveries } from '@/components/new-discoveries'
import { GenreBreakdown } from '@/components/genre-breakdown'
import { LovedTracksTimeline } from '@/components/loved-tracks-timeline'
import { ExportButton } from '@/components/export-button'
import { LastActivityNudge } from '@/components/last-activity-nudge'
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
      <NowPlaying username={username} />
      <div className="flex items-center gap-4 mb-6 mt-4">
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
          <LastActivityNudge lastSyncedAt={lastSyncedAt} />
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isOwner && <ExportButton username={username} />}
          <SyncStatus lastSyncedAt={lastSyncedAt} isOwner={isOwner} />
        </div>
      </div>

      <div className="grid gap-6">
        <StatsChart username={username} scrobbles={allScrobbles} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HourlyHeatmap scrobbles={allScrobbles} />
          <DayOfWeekChart scrobbles={allScrobbles} />
          <ListeningClock scrobbles={allScrobbles} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ListeningStreaks scrobbles={allScrobbles} />
          <ListeningSessions scrobbles={allScrobbles} />
          <Milestones totalScrobbles={totalScrobbles} />
        </div>
        <TopLists
          artists={topArtists[period]}
          albums={topAlbums[period]}
          tracks={topTracks[period]}
          period={period}
          onPeriodChange={setPeriod}
        />
        <NewDiscoveries username={username} />
        <GenreBreakdown username={username} />
        <div className="grid md:grid-cols-2 gap-6">
          <RecentTracks tracks={recentTracks} />
          <LovedTracks tracks={lovedTracks} />
        </div>
        <LovedTracksTimeline lovedTracks={lovedTracks} />
      </div>
    </div>
  )
}
