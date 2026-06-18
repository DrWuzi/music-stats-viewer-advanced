import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const topArtists = await prisma.topArtist.findMany({
    where: { userId: user.id, period: 'overall' },
    orderBy: { rank: 'asc' },
    take: 15,
    select: { name: true, rank: true, playcount: true },
  })

  if (topArtists.length === 0) {
    return NextResponse.json({ tags: [] })
  }

  const apiKey = process.env.LASTFM_API_KEY

  // Fetch tags for all artists concurrently, tolerating failures
  const results = await Promise.allSettled(
    topArtists.map(async (artist) => {
      const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artist.name)}&api_key=${apiKey}&format=json`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const tags: { name: string; count: number }[] = data?.toptags?.tag ?? []
      return { artist, tags }
    })
  )

  // Aggregate tags weighted by artist rank (rank 1 = weight 15, rank 15 = weight 1)
  const tagScores: Record<string, { score: number; artistCount: number }> = {}

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const { artist, tags } = result.value
    const weight = Math.max(1, 16 - artist.rank)

    for (const tag of tags) {
      const name = tag.name?.trim()
      if (!name || name.length < 2 || /^\d+$/.test(name)) continue
      if (!tagScores[name]) {
        tagScores[name] = { score: 0, artistCount: 0 }
      }
      tagScores[name].score += weight
      tagScores[name].artistCount += 1
    }
  }

  const topTags = Object.entries(tagScores)
    .map(([tag, { score, artistCount }]) => ({ tag, score, artistCount }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)

  return NextResponse.json(
    { tags: topTags },
    { headers: { 'Cache-Control': 'public, s-maxage=3600' } }
  )
}
