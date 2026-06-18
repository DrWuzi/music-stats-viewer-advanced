import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = Promise<{ name: string }>

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { name } = await params
  const tagName = decodeURIComponent(name)
  const username = req.nextUrl.searchParams.get('username')

  const apiKey = process.env.LASTFM_API_KEY

  // Fetch Last.fm tag top artists
  const tagUrl = `https://ws.audioscrobbler.com/2.0/?method=tag.gettopartists&tag=${encodeURIComponent(tagName)}&api_key=${apiKey}&format=json&limit=50`
  const tagRes = await fetch(tagUrl)
  const tagData = tagRes.ok ? await tagRes.json() : {}
  const tagArtists: { name: string; rank?: number }[] = tagData?.topartists?.artist ?? []

  // Build a lowercased name -> rank map for fast lookup
  const tagArtistMap = new Map<string, number>()
  tagArtists.forEach((a, idx) => {
    tagArtistMap.set(a.name.toLowerCase(), idx + 1)
  })

  // If no username provided, return tag info only
  if (!username) {
    return NextResponse.json(
      { tagName, userMatches: [], matchCount: 0 },
      { headers: { 'Cache-Control': 'public, s-maxage=3600' } }
    )
  }

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json(
      { tagName, userMatches: [], matchCount: 0 },
      { headers: { 'Cache-Control': 'public, s-maxage=3600' } }
    )
  }

  const userArtists = await prisma.topArtist.findMany({
    where: { userId: user.id, period: 'overall' },
    orderBy: { rank: 'asc' },
    select: { name: true, playcount: true },
  })

  const userMatches = userArtists
    .filter((a) => tagArtistMap.has(a.name.toLowerCase()))
    .map((a) => ({
      name: a.name,
      playcount: a.playcount,
      tagRank: tagArtistMap.get(a.name.toLowerCase())!,
    }))
    .sort((a, b) => b.playcount - a.playcount)

  return NextResponse.json(
    { tagName, userMatches, matchCount: userMatches.length },
    { headers: { 'Cache-Control': 'public, s-maxage=3600' } }
  )
}
