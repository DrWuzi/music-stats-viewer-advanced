import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BASE = 'https://ws.audioscrobbler.com/2.0/'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export interface Recommendation {
  name: string
  tag: string
  tagRank: number
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  const apiKey = process.env.LASTFM_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  // --- 1. Fetch user's top tags from Last.fm ---
  let topTags: Array<{ name: string; count: number }> = []
  try {
    const tagsUrl = new URL(BASE)
    tagsUrl.searchParams.set('method', 'user.gettoptags')
    tagsUrl.searchParams.set('user', username)
    tagsUrl.searchParams.set('api_key', apiKey)
    tagsUrl.searchParams.set('format', 'json')

    const tagsRes = await fetch(tagsUrl.toString())
    if (tagsRes.ok) {
      const tagsData = await tagsRes.json()
      topTags = (tagsData?.toptags?.tag ?? []).map(
        (t: { name: string; count: string | number }) => ({
          name: t.name,
          count: Number(t.count),
        }),
      )
    }
  } catch {
    // fall through with empty tags
  }

  if (topTags.length === 0) {
    return NextResponse.json({ recommendations: [] })
  }

  const top3Tags = topTags.slice(0, 3)

  // --- 2. Build set of user's known artists ---
  // Try DB first (fast), fall back to empty set (still shows tag-based artists)
  const userArtistNames = new Set<string>()
  try {
    const user = await prisma.user.findUnique({
      where: { lastfmUsername: username },
      select: { id: true },
    })
    if (user) {
      const dbArtists = await prisma.topArtist.findMany({
        where: { userId: user.id },
        select: { name: true },
      })
      for (const a of dbArtists) {
        userArtistNames.add(a.name.toLowerCase())
      }
    }
  } catch {
    // proceed without DB filter
  }

  // Also fetch user's overall top artists from Last.fm to cross-reference
  // (handles users not yet in DB / not yet synced)
  try {
    const topArtistsUrl = new URL(BASE)
    topArtistsUrl.searchParams.set('method', 'user.gettopartists')
    topArtistsUrl.searchParams.set('user', username)
    topArtistsUrl.searchParams.set('period', 'overall')
    topArtistsUrl.searchParams.set('limit', '200')
    topArtistsUrl.searchParams.set('api_key', apiKey)
    topArtistsUrl.searchParams.set('format', 'json')

    const topArtistsRes = await fetch(topArtistsUrl.toString())
    if (topArtistsRes.ok) {
      const topArtistsData = await topArtistsRes.json()
      const artists: Array<{ name: string }> = topArtistsData?.topartists?.artist ?? []
      for (const a of artists) {
        userArtistNames.add(a.name.toLowerCase())
      }
    }
  } catch {
    // proceed with whatever we have
  }

  await sleep(150)

  // --- 3. For each of the top 3 tags fetch tag.gettopartists ---
  const recommendationsMap = new Map<string, Recommendation>()

  for (const tag of top3Tags) {
    try {
      const tagUrl = new URL(BASE)
      tagUrl.searchParams.set('method', 'tag.gettopartists')
      tagUrl.searchParams.set('tag', tag.name)
      tagUrl.searchParams.set('limit', '50')
      tagUrl.searchParams.set('api_key', apiKey)
      tagUrl.searchParams.set('format', 'json')

      const tagRes = await fetch(tagUrl.toString())
      if (tagRes.ok) {
        const tagData = await tagRes.json()
        const tagArtists: Array<{ name: string; '@attr'?: { rank: string } }> =
          tagData?.topartists?.artist ?? []

        for (const artist of tagArtists) {
          const nameLower = artist.name.toLowerCase()
          if (userArtistNames.has(nameLower)) continue
          if (recommendationsMap.has(nameLower)) continue

          recommendationsMap.set(nameLower, {
            name: artist.name,
            tag: tag.name,
            tagRank: Number(artist['@attr']?.rank ?? 99),
          })
        }
      }
    } catch {
      // skip failed tag requests
    }

    await sleep(150)
  }

  const recommendations = Array.from(recommendationsMap.values())
    .sort((a, b) => a.tagRank - b.tagRank)
    .slice(0, 8)

  return NextResponse.json({ recommendations })
}
