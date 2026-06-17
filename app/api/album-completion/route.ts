import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')
  if (!username) {
    return NextResponse.json({ error: 'Missing username' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ albums: [] })
  }

  const topAlbums = await prisma.topAlbum.findMany({
    where: { userId: user.id, period: 'overall' },
    orderBy: { rank: 'asc' },
    take: 10,
    select: { name: true, artist: true },
  })

  if (!topAlbums.length) {
    return NextResponse.json({ albums: [] })
  }

  const results: {
    album: string
    artist: string
    totalTracks: number
    scrobbledTracks: number
    pct: number
  }[] = []

  const apiKey = process.env.LASTFM_API_KEY ?? ''

  for (const topAlbum of topAlbums) {
    try {
      const url = `https://ws.audioscrobbler.com/2.0/?method=album.getInfo&artist=${encodeURIComponent(topAlbum.artist)}&album=${encodeURIComponent(topAlbum.name)}&api_key=${apiKey}&format=json`
      const res = await fetch(url)
      if (!res.ok) {
        await sleep(200)
        continue
      }
      const json = await res.json() as {
        album?: {
          tracks?: {
            track?: { name: string }[] | { name: string }
          }
        }
        error?: number
      }

      if (json.error || !json.album?.tracks) {
        await sleep(200)
        continue
      }

      const rawTracks = json.album.tracks.track
      const trackNames: string[] = Array.isArray(rawTracks)
        ? rawTracks.map((t) => t.name)
        : rawTracks
          ? [rawTracks.name]
          : []

      if (!trackNames.length) {
        await sleep(200)
        continue
      }

      const totalTracks = trackNames.length
      const trackNamesLower = trackNames.map((n) => n.toLowerCase())

      const scrobbledCount = await prisma.scrobble.count({
        where: {
          userId: user.id,
          artist: { equals: topAlbum.artist, mode: 'insensitive' },
          album: { equals: topAlbum.name, mode: 'insensitive' },
          track: { in: trackNamesLower.map((_, i) => trackNames[i]) },
        },
      })

      // Use a more robust count: check distinct track names scrobbled
      const scrobbledTracks = await prisma.scrobble.findMany({
        where: {
          userId: user.id,
          artist: { equals: topAlbum.artist, mode: 'insensitive' },
          album: { equals: topAlbum.name, mode: 'insensitive' },
        },
        select: { track: true },
        distinct: ['track'],
      })

      const scrobbledTrackNamesLower = scrobbledTracks.map((s) => s.track.toLowerCase())
      const matched = trackNamesLower.filter((tn) => scrobbledTrackNamesLower.includes(tn)).length

      results.push({
        album: topAlbum.name,
        artist: topAlbum.artist,
        totalTracks,
        scrobbledTracks: matched,
        pct: Math.round((matched / totalTracks) * 100),
      })
    } catch {
      // skip on error
    }
    await sleep(200)
  }

  return NextResponse.json({ albums: results })
}
