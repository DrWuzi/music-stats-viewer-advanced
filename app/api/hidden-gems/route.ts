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
    return NextResponse.json({ gems: [] })
  }

  // Get top 30 tracks overall
  const topTracks = await prisma.topTrack.findMany({
    where: { userId: user.id, period: 'overall' },
    orderBy: { rank: 'asc' },
    take: 30,
  })

  if (topTracks.length === 0) {
    return NextResponse.json({ gems: [] })
  }

  type GemCandidate = {
    track: string
    artist: string
    userPlays: number
    globalPlays: number
    score: number
  }

  const candidates: GemCandidate[] = []

  for (const t of topTracks) {
    try {
      const url = new URL(BASE)
      url.searchParams.set('method', 'track.getInfo')
      url.searchParams.set('artist', t.artist)
      url.searchParams.set('track', t.name)
      url.searchParams.set('api_key', process.env.LASTFM_API_KEY!)
      url.searchParams.set('format', 'json')

      const res = await fetch(url.toString())
      const data = await res.json()

      if (data.error || !data.track?.listeners) {
        await sleep(150)
        continue
      }

      const globalPlays = Number(data.track.playcount ?? 0)
      if (globalPlays <= 0) {
        await sleep(150)
        continue
      }

      const userPlays = t.playcount
      const score = userPlays / Math.log10(globalPlays + 1)

      candidates.push({
        track: t.name,
        artist: t.artist,
        userPlays,
        globalPlays,
        score,
      })
    } catch {
      // Skip on error
    }

    await sleep(150)
  }

  const gems = candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ track, artist, userPlays, globalPlays }) => ({
      track,
      artist,
      userPlays,
      globalPlays,
    }))

  return NextResponse.json({ gems })
}
