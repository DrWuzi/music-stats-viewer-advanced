import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { syncUser } from '@/lib/sync'
import { lastfmClient } from '@/lib/lastfm'
import { UserProfile } from '@/components/user-profile'
import type { Period } from '@/lib/lastfm'

const PERIODS = ['7day', '1month', '3month', '6month', '12month', 'overall'] as const

function groupByPeriod<T extends { period: string }>(items: T[]): Record<Period, T[]> {
  return Object.fromEntries(
    PERIODS.map((p) => [p, items.filter((i) => i.period === p)]),
  ) as Record<Period, T[]>
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      scrobbles: { orderBy: { scrobbledAt: 'desc' }, take: 50 },
      topArtists: true,
      topAlbums: true,
      topTracks: true,
      lovedTracks: { orderBy: { lovedAt: 'desc' }, take: 100 },
    },
  })

  if (!user) redirect('/login')

  if (!user.lastSyncedAt) {
    await syncUser(user.lastfmUsername)
    redirect('/dashboard')
  }

  const thirtyDaysAgo = new Date(Date.now() - 360 * 24 * 60 * 60 * 1000)
  const [userInfo, chartScrobbles] = await Promise.all([
    lastfmClient.getUserInfo(user.lastfmUsername).catch(() => null),
    prisma.scrobble.findMany({
      where: { userId: user.id, scrobbledAt: { gte: thirtyDaysAgo } },
      select: { scrobbledAt: true, artist: true, track: true },
    }),
  ])

  return (
    <UserProfile
      username={user.lastfmUsername}
      totalScrobbles={userInfo?.playcount ?? user.scrobbles.length}
      registeredAt={userInfo?.registered ?? user.createdAt}
      imageUrl={userInfo?.imageUrl ?? ''}
      lastSyncedAt={user.lastSyncedAt}
      isOwner={true}
      recentTracks={user.scrobbles.map((s) => ({
        artist: s.artist,
        album: s.album,
        track: s.track,
        scrobbledAt: s.scrobbledAt,
      }))}
      topArtists={groupByPeriod(user.topArtists)}
      topAlbums={groupByPeriod(user.topAlbums)}
      topTracks={groupByPeriod(user.topTracks)}
      lovedTracks={user.lovedTracks.map((l) => ({ artist: l.artist, track: l.track, lovedAt: l.lovedAt }))}
      allScrobbles={chartScrobbles}
    />
  )
}
