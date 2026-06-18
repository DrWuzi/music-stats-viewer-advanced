import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { syncUser } from '@/lib/sync'
import { lastfmClient } from '@/lib/lastfm'
import { UserProfile } from '@/components/user-profile'
import type { Period } from '@/lib/lastfm'

type Props = { params: Promise<{ username: string }> }

const PERIODS = ['7day', '1month', '3month', '6month', '12month', 'overall'] as const

function groupByPeriod<T extends { period: string }>(items: T[]): Record<Period, T[]> {
  return Object.fromEntries(
    PERIODS.map((p) => [p, items.filter((i) => i.period === p)]),
  ) as Record<Period, T[]>
}

const INCLUDE = {
  scrobbles: { orderBy: { scrobbledAt: 'desc' } as const, take: 50 },
  topArtists: true,
  topAlbums: true,
  topTracks: true,
  lovedTracks: { orderBy: { lovedAt: 'desc' } as const, take: 100 },
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username} — Last.fm Advanced` }
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const session = await getSession()

  let user = await prisma.user.findUnique({ where: { lastfmUsername: username }, include: INCLUDE })

  // Sync if: user doesn't exist yet, OR exists but never completed a sync
  if (!user || !user.lastSyncedAt) {
    try {
      await lastfmClient.getUserInfo(username) // 404s if username invalid on Last.fm
      if (!user) {
        await prisma.user.create({ data: { lastfmUsername: username, sessionKey: '' } })
      }
      await syncUser(username)
    } catch (err) {
      // If user was never in DB and sync failed, 404. If stub exists, fall through and show what we have.
      if (!user) notFound()
    }
    user = await prisma.user.findUnique({ where: { lastfmUsername: username }, include: INCLUDE })
    if (!user) notFound()
  }

  const thirtyDaysAgo = new Date(Date.now() - 360 * 24 * 60 * 60 * 1000)
  const [userInfo, chartScrobbles, uniqueArtistsResult, uniqueTracksResult, uniqueAlbumsResult, firstScrobble] = await Promise.all([
    lastfmClient.getUserInfo(username).catch(() => null),
    prisma.scrobble.findMany({
      where: { userId: user.id, scrobbledAt: { gte: thirtyDaysAgo } },
      select: { scrobbledAt: true, artist: true, track: true },
    }),
    prisma.scrobble.groupBy({ by: ['artist'], where: { userId: user.id }, _count: true }),
    prisma.scrobble.groupBy({ by: ['track', 'artist'], where: { userId: user.id }, _count: true }),
    prisma.scrobble.groupBy({ by: ['album'], where: { userId: user.id, album: { not: null } }, _count: true }),
    prisma.scrobble.findFirst({
      where: { userId: user.id },
      orderBy: { scrobbledAt: 'asc' },
      select: { scrobbledAt: true },
    }),
  ])
  const isOwner = session?.lastfmUsername === username

  const uniqueArtistCount = uniqueArtistsResult.length
  const uniqueTrackCount = uniqueTracksResult.length
  const uniqueAlbumCount = uniqueAlbumsResult.length

  // Scrobbles per day average
  const registeredDate = userInfo?.registered ?? user.createdAt
  const daysSinceRegistration = Math.max(
    1,
    Math.floor((Date.now() - new Date(registeredDate).getTime()) / (1000 * 60 * 60 * 24)),
  )
  const totalScrobblesCount = userInfo?.playcount ?? user.scrobbles.length
  const scrobblesPerDay = totalScrobblesCount / daysSinceRegistration

  // Longest streak from all scrobbles date range: use chartScrobbles only (30-day window)
  // We'll compute it client-side in the component from allScrobbles; pass null here

  const profileStats = {
    uniqueArtists: uniqueArtistCount,
    uniqueTracks: uniqueTrackCount,
    uniqueAlbums: uniqueAlbumCount,
    scrobblesPerDay: Math.round(scrobblesPerDay * 10) / 10,
    firstScrobbleAt: firstScrobble?.scrobbledAt ?? null,
  }

  const totalScrobbles = totalScrobblesCount
  const imageUrl = userInfo?.imageUrl?.includes('2a96cbd8b46e442fc41c2b86b821562f') ? '' : (userInfo?.imageUrl ?? '')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: username,
            url: `https://lastfm-advanced.vercel.app/user/${username}`,
            ...(imageUrl ? { image: imageUrl } : {}),
            description: `${username} has scrobbled ${totalScrobbles.toLocaleString('en-US')} tracks on Last.fm`,
            memberOf: {
              '@type': 'Organization',
              name: 'Last.fm',
              url: 'https://www.last.fm',
            },
            sameAs: [`https://www.last.fm/user/${username}`],
          }),
        }}
      />
      <UserProfile
        username={user.lastfmUsername}
        totalScrobbles={totalScrobbles}
        registeredAt={registeredDate}
        imageUrl={imageUrl}
        lastSyncedAt={user.lastSyncedAt}
        isOwner={isOwner}
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
        profileStats={profileStats}
      />
    </>
  )
}
