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
    return NextResponse.json({ eras: [] })
  }

  const scrobbles = await prisma.scrobble.findMany({
    where: { userId: user.id },
    select: { artist: true, scrobbledAt: true },
  })

  if (scrobbles.length === 0) {
    return NextResponse.json({ eras: [] })
  }

  // Group by year then artist counts
  const byYear: Record<number, Record<string, number>> = {}
  for (const s of scrobbles) {
    const year = s.scrobbledAt.getFullYear()
    if (!byYear[year]) byYear[year] = {}
    byYear[year][s.artist] = (byYear[year][s.artist] ?? 0) + 1
  }

  // Get top 3 artists per year
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a)

  const eraArtistsMap: Record<number, string[]> = {}
  const uniqueArtists = new Set<string>()

  for (const year of years) {
    const sorted = Object.entries(byYear[year])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([artist]) => artist)
    eraArtistsMap[year] = sorted
    for (const a of sorted) uniqueArtists.add(a)
  }

  // Cap unique artists to 10 for Last.fm calls
  const artistsToFetch = Array.from(uniqueArtists).slice(0, 10)
  const apiKey = process.env.LASTFM_API_KEY
  const artistTagMap: Record<string, string> = {}

  for (const artist of artistsToFetch) {
    try {
      const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getTopTags&artist=${encodeURIComponent(artist)}&api_key=${apiKey}&format=json`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        const tags: { name: string; count: number }[] = data?.toptags?.tag ?? []
        const topTag = tags.find(
          (t) => t.name && t.name.length >= 3 && !/^\d+$/.test(t.name),
        )
        if (topTag) {
          artistTagMap[artist] = topTag.name
        }
      }
    } catch {
      // skip
    }
    await sleep(200)
  }

  const eras = years.map((year) => {
    const topArtists = eraArtistsMap[year]
    // Pick the first tag we can find among the top artists
    const topTag =
      topArtists.map((a) => artistTagMap[a]).find(Boolean) ?? 'unknown'
    return { year, topArtists, topTag }
  })

  return NextResponse.json({ eras })
}
