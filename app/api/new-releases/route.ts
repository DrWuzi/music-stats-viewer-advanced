import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BASE = 'https://ws.audioscrobbler.com/2.0/'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ releases: [] })
  }

  // Get top 10 artists overall
  const topArtists = await prisma.topArtist.findMany({
    where: { userId: user.id, period: 'overall' },
    orderBy: { rank: 'asc' },
    take: 10,
  })

  if (topArtists.length === 0) {
    return NextResponse.json({ releases: [] })
  }

  // Get all albums user has already scrobbled (any period) — name+artist pairs
  const userAlbums = await prisma.topAlbum.findMany({
    where: { userId: user.id },
    select: { name: true, artist: true },
  })
  const userAlbumKeys = new Set(
    userAlbums.map((a) => `${a.name.toLowerCase()}|||${a.artist.toLowerCase()}`),
  )

  type Release = { album: string; artist: string; imageUrl: string }
  const releases: Release[] = []

  for (const artist of topArtists) {
    if (releases.length >= 15) break

    try {
      const url = new URL(BASE)
      url.searchParams.set('method', 'artist.getTopAlbums')
      url.searchParams.set('artist', artist.name)
      url.searchParams.set('limit', '5')
      url.searchParams.set('api_key', process.env.LASTFM_API_KEY!)
      url.searchParams.set('format', 'json')

      const res = await fetch(url.toString())
      const data = await res.json()

      if (data.error || !data.topalbums?.album) {
        await sleep(200)
        continue
      }

      const albums: Array<{
        name: string
        artist: { name: string }
        image: Array<{ '#text': string; size: string }>
      }> = data.topalbums.album

      for (const album of albums) {
        if (releases.length >= 15) break

        const key = `${album.name.toLowerCase()}|||${album.artist.name.toLowerCase()}`
        if (userAlbumKeys.has(key)) continue

        const largeImage = album.image?.find((i) => i.size === 'large')
        releases.push({
          album: album.name,
          artist: album.artist.name,
          imageUrl: largeImage?.['#text'] ?? '',
        })
      }
    } catch {
      // Skip on error
    }

    await sleep(200)
  }

  return NextResponse.json({ releases: releases.slice(0, 15) })
}
