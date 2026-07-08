import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { syncUser } from '@/lib/sync'
import { lastfmClient } from '@/lib/lastfm'
import { UserProfile } from '@/components/user-profile'
import { DEFAULT_ORDER, type WidgetId, type WidgetSize } from '@/lib/dashboard-widgets'
import type { Period } from '@/lib/lastfm'
import {
  ProfileLoadingAnimation,
  isValidLoadingAnimation,
  type LoadingAnimationKey,
} from '@/components/profile-loading-animations'

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

  // Cheap existence probe — resolved (and any notFound() thrown) before the
  // Suspense boundary below starts streaming, since Next.js cannot change
  // the HTTP status code once the response body has started streaming.
  let existing = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { id: true, lastSyncedAt: true, loadingAnimation: true },
  })

  // Sync if: user doesn't exist yet, OR exists but never completed a sync
  if (!existing || !existing.lastSyncedAt) {
    try {
      await lastfmClient.getUserInfo(username) // 404s if username invalid on Last.fm
      if (!existing) {
        await prisma.user.create({ data: { lastfmUsername: username, sessionKey: '' } })
      }
      await syncUser(username)
    } catch {
      // If user was never in DB and sync failed, 404. If stub exists, fall through and show what we have.
      if (!existing) notFound()
    }
    existing = await prisma.user.findUnique({
      where: { lastfmUsername: username },
      select: { id: true, lastSyncedAt: true, loadingAnimation: true },
    })
    if (!existing) notFound()
  }

  const preset: LoadingAnimationKey = isValidLoadingAnimation(existing.loadingAnimation)
    ? existing.loadingAnimation
    : 'none'

  return (
    <Suspense fallback={<ProfileLoadingAnimation preset={preset} />}>
      <ProfilePageContent username={username} />
    </Suspense>
  )
}

async function ProfilePageContent({ username }: { username: string }) {
  const session = await getSession()

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username }, include: INCLUDE })
  // Defensive only — UserProfilePage's existence check above already confirmed this row
  // exists. If it's deleted in the narrow window between that check and this query, this
  // notFound() runs inside the Suspense boundary and won't produce a correct 404 status.
  if (!user) notFound()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 360 * 24 * 60 * 60 * 1000)
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

  const savedLayout: { order?: WidgetId[]; sizes?: Partial<Record<WidgetId, WidgetSize>> } | undefined = (() => {
    try {
      const raw = user.dashboardOrder
      if (!raw) return undefined
      const parsed = JSON.parse(raw) as WidgetId[] | { order?: WidgetId[]; sizes?: Partial<Record<WidgetId, WidgetSize>> }
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((id) => (DEFAULT_ORDER as readonly string[]).includes(id))
        const added = DEFAULT_ORDER.filter((id) => !valid.includes(id))
        return { order: [...valid, ...added] }
      }

      const validOrder = Array.isArray(parsed.order)
        ? parsed.order.filter((id) => (DEFAULT_ORDER as readonly string[]).includes(id))
        : undefined
      const added = DEFAULT_ORDER.filter((id) => !validOrder?.includes(id))
      const validSizes = parsed.sizes && typeof parsed.sizes === 'object'
        ? Object.fromEntries(
            Object.entries(parsed.sizes)
              .filter(([id, value]) => (DEFAULT_ORDER as readonly string[]).includes(id) && (value === 1 || value === 2)),
          ) as Partial<Record<WidgetId, WidgetSize>>
        : undefined

      return {
        order: validOrder ? [...validOrder, ...added] : [...DEFAULT_ORDER],
        sizes: validSizes,
      }
    } catch { return undefined }
  })()

  const savedOrder = savedLayout?.order
  const savedSizes = savedLayout?.sizes

  const savedHidden: WidgetId[] | undefined = (() => {
    try {
      const raw = user.dashboardHidden
      if (!raw) return undefined
      return (JSON.parse(raw) as WidgetId[]).filter((id) => (DEFAULT_ORDER as readonly string[]).includes(id))
    } catch { return undefined }
  })()

  const uniqueArtistCount = uniqueArtistsResult.length
  const uniqueTrackCount = uniqueTracksResult.length
  const uniqueAlbumCount = uniqueAlbumsResult.length

  // Scrobbles per day average
  const registeredDate = userInfo?.registered ?? user.createdAt
  const daysSinceRegistration = Math.max(
    1,
    Math.floor((now.getTime() - new Date(registeredDate).getTime()) / (1000 * 60 * 60 * 24)),
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
        initialDashboardOrder={savedOrder}
        initialDashboardHidden={savedHidden}
        initialDashboardSizes={savedSizes}
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
