import { lastfmClient, type Period } from './lastfm'
import { prisma } from './prisma'

export const PERIODS: Period[] = ['7day', '1month', '3month', '6month', '12month', 'overall']

export async function syncUser(lastfmUsername: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { lastfmUsername } })
  if (!user) throw new Error(`User ${lastfmUsername} not found`)

  const from = user.lastSyncedAt ? Math.floor(user.lastSyncedAt.getTime() / 1000) : undefined

  const tracks = await lastfmClient.getRecentTracks(lastfmUsername, from)
  if (tracks.length > 0) {
    await prisma.scrobble.createMany({
      data: tracks.map((t) => ({
        userId: user.id,
        artist: t.artist,
        album: t.album,
        track: t.name,
        scrobbledAt: t.scrobbledAt ?? new Date(),
      })),
      skipDuplicates: true,
    })
  }

  for (const period of PERIODS) {
    const [artists, albums, topTracks] = await Promise.all([
      lastfmClient.getTopArtists(lastfmUsername, period),
      lastfmClient.getTopAlbums(lastfmUsername, period),
      lastfmClient.getTopTracks(lastfmUsername, period),
    ])
    await prisma.topArtist.deleteMany({ where: { userId: user.id, period } })
    await prisma.topAlbum.deleteMany({ where: { userId: user.id, period } })
    await prisma.topTrack.deleteMany({ where: { userId: user.id, period } })
    await Promise.all([
      prisma.topArtist.createMany({ data: artists.map((a) => ({ ...a, userId: user.id, period })) }),
      prisma.topAlbum.createMany({ data: albums.map((a) => ({ ...a, userId: user.id, period })) }),
      prisma.topTrack.createMany({ data: topTracks.map((t) => ({ ...t, userId: user.id, period })) }),
    ])
  }

  const loved = await lastfmClient.getLovedTracks(lastfmUsername)
  const existing = await prisma.lovedTrack.findMany({
    where: { userId: user.id },
    select: { artist: true, track: true },
  })
  const existingKeys = new Set(existing.map((l) => `${l.artist}::${l.track}`))
  const newLoved = loved.filter((l) => !existingKeys.has(`${l.artist}::${l.name}`))
  if (newLoved.length > 0) {
    await prisma.lovedTrack.createMany({
      data: newLoved.map((l) => ({
        userId: user.id,
        artist: l.artist,
        track: l.name,
        lovedAt: l.lovedAt,
      })),
      skipDuplicates: true,
    })
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastSyncedAt: new Date() } })
}
