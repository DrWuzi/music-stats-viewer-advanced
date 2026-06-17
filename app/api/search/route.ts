import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') ?? ''
  const q = searchParams.get('q') ?? ''

  if (!username) {
    return NextResponse.json({ error: 'username required' }, { status: 400 })
  }

  if (!q.trim()) {
    return NextResponse.json({ artists: [], tracks: [], albums: [] })
  }

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const userId = user.id

  const artistRows = await prisma.scrobble.findMany({
    where: { userId, artist: { contains: q, mode: 'insensitive' } },
    select: { artist: true },
    distinct: ['artist'],
    take: 10,
  })

  const trackRows = await prisma.scrobble.findMany({
    where: {
      userId,
      OR: [
        { track: { contains: q, mode: 'insensitive' } },
        { artist: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { track: true, artist: true },
    distinct: ['track', 'artist'],
    take: 10,
  })

  const albumRows = await prisma.scrobble.findMany({
    where: {
      userId,
      album: { contains: q, mode: 'insensitive' },
      NOT: { album: null },
    },
    select: { album: true, artist: true },
    distinct: ['album', 'artist'],
    take: 10,
  })

  return NextResponse.json({
    artists: artistRows.map((r) => r.artist),
    tracks: trackRows.map((r) => ({ track: r.track, artist: r.artist })),
    albums: albumRows
      .filter((r) => r.album !== null)
      .map((r) => ({ album: r.album as string, artist: r.artist })),
  })
}
