import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
    return NextResponse.json({ tags: [] })
  }

  const topArtists = await prisma.topArtist.findMany({
    where: { userId: user.id, period: 'overall' },
    orderBy: { rank: 'asc' },
    take: 15,
    select: { name: true },
  })

  if (topArtists.length === 0) {
    return NextResponse.json({ tags: [] })
  }

  const apiKey = process.env.LASTFM_API_KEY
  const tagCounts: Record<string, number> = {}

  for (const artist of topArtists) {
    try {
      const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getTopTags&artist=${encodeURIComponent(artist.name)}&api_key=${apiKey}&format=json`
      const res = await fetch(url)

      if (res.ok) {
        const data = await res.json()
        const tags: { name: string; count: number }[] = data?.toptags?.tag ?? []

        for (const tag of tags) {
          const name = tag.name?.trim()
          if (!name || name.length < 3 || /^\d+$/.test(name)) continue
          tagCounts[name] = (tagCounts[name] ?? 0) + tag.count
        }
      }
    } catch {
      // skip failed artist requests
    }

    await sleep(200)
  }

  const sorted = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  return NextResponse.json({ tags: sorted })
}
