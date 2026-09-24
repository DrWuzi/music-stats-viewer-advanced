import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PlaylistBuilder } from '@/components/playlist-builder'
import { PageContainer } from '@/components/page-container'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username}'s Playlist Builder — Last.fm Advanced` }
}

export default async function PlaylistPage({ params }: Props) {
  const { username } = await params

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username } })
  if (!user) notFound()

  const [topTracksAll, lovedTracks, recentScrobbles] = await Promise.all([
    prisma.topTrack.findMany({ where: { userId: user.id } }),
    prisma.lovedTrack.findMany({
      where: { userId: user.id },
      orderBy: { lovedAt: 'desc' },
    }),
    prisma.scrobble.findMany({
      where: { userId: user.id },
      orderBy: { scrobbledAt: 'desc' },
      take: 50,
    }),
  ])

  const topTracksOverall = topTracksAll
    .filter((t) => t.period === 'overall')
    .sort((a, b) => a.rank - b.rank)
    .map((t) => ({ name: t.name, artist: t.artist, playcount: t.playcount }))

  const topTracksMonth = topTracksAll
    .filter((t) => t.period === '1month')
    .sort((a, b) => a.rank - b.rank)
    .map((t) => ({ name: t.name, artist: t.artist, playcount: t.playcount }))

  const loved = lovedTracks.map((t) => ({ artist: t.artist, track: t.track }))

  const recent = recentScrobbles.map((s) => ({
    artist: s.artist,
    track: s.track,
    album: s.album ?? '',
  }))

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <PageContainer maxWidth="3xl" padding={false} className="space-y-6">
        <div>
          <Link
            href={`/user/${username}`}
            className="text-muted-foreground hover:text-foreground text-sm mb-2 inline-block"
          >
            ← Back to profile
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-chart-1 to-chart-5 bg-clip-text text-transparent">Playlist Builder</h1>
          <p className="text-muted-foreground mt-1">
            Build and export a playlist from {username}&apos;s listening history.
          </p>
        </div>

        <PlaylistBuilder
          username={username}
          topTracksOverall={topTracksOverall}
          topTracksMonth={topTracksMonth}
          lovedTracks={loved}
          recentTracks={recent}
        />
      </PageContainer>
    </main>
  )
}
