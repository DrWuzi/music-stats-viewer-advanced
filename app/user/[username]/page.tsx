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

  if (!user) {
    try {
      await lastfmClient.getUserInfo(username)
      await prisma.user.create({ data: { lastfmUsername: username, sessionKey: '' } })
      await syncUser(username)
    } catch {
      notFound()
    }
    user = await prisma.user.findUnique({ where: { lastfmUsername: username }, include: INCLUDE })
    if (!user) notFound()
  }

  const userInfo = await lastfmClient.getUserInfo(username).catch(() => null)
  const isOwner = session?.lastfmUsername === username

  return (
    <UserProfile
      username={user.lastfmUsername}
      totalScrobbles={userInfo?.playcount ?? user.scrobbles.length}
      registeredAt={userInfo?.registered ?? user.createdAt}
      imageUrl={userInfo?.imageUrl ?? ''}
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
      allScrobbles={user.scrobbles.map((s) => ({ scrobbledAt: s.scrobbledAt }))}
    />
  )
}
