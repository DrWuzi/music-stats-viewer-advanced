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
    return NextResponse.json({ suggestions: [] })
  }

  // Get top 5 artists (overall, rank 1-5)
  const topArtists = await prisma.topArtist.findMany({
    where: { userId: user.id, period: 'overall', rank: { lte: 5 } },
    orderBy: { rank: 'asc' },
    take: 5,
  })

  if (topArtists.length === 0) {
    return NextResponse.json({ suggestions: [] })
  }

  // Get all user's artists (any period) for filtering
  const allUserArtists = await prisma.topArtist.findMany({
    where: { userId: user.id },
    select: { name: true },
  })
  const userArtistNames = new Set(allUserArtists.map((a) => a.name.toLowerCase()))

  // Fetch similar artists for each top artist
  type Suggestion = { name: string; similarity: number; basedOn: string }
  const suggestionsMap = new Map<string, Suggestion>()

  for (const artist of topArtists) {
    try {
      const url = new URL(BASE)
      url.searchParams.set('method', 'artist.getSimilar')
      url.searchParams.set('artist', artist.name)
      url.searchParams.set('limit', '10')
      url.searchParams.set('api_key', process.env.LASTFM_API_KEY!)
      url.searchParams.set('format', 'json')

      const res = await fetch(url.toString())
      const data = await res.json()

      if (data.error || !data.similarartists?.artist) {
        await sleep(200)
        continue
      }

      const similar: Array<{ name: string; match: string }> = data.similarartists.artist

      for (const s of similar) {
        const nameLower = s.name.toLowerCase()
        if (userArtistNames.has(nameLower)) continue
        if (!suggestionsMap.has(nameLower)) {
          suggestionsMap.set(nameLower, {
            name: s.name,
            similarity: Math.round(parseFloat(s.match) * 100),
            basedOn: artist.name,
          })
        }
      }
    } catch {
      // Skip on error
    }

    await sleep(200)
  }

  const suggestions = Array.from(suggestionsMap.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10)

  return NextResponse.json({ suggestions })
}
