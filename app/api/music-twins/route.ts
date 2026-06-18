import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')?.trim()

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  // Find the requesting user and their top artists
  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    include: {
      topArtists: {
        where: { period: 'overall' },
        orderBy: { rank: 'asc' },
        take: 20,
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (user.topArtists.length === 0) {
    return NextResponse.json({ twins: [] })
  }

  // Build a set of the current user's artist names (lowercased)
  const userArtistSet = new Set(user.topArtists.map((a) => a.name.toLowerCase()))

  // Fetch all other users with their top artists
  const otherUsers = await prisma.user.findMany({
    where: {
      lastfmUsername: { not: username },
    },
    include: {
      topArtists: {
        where: { period: 'overall' },
        orderBy: { rank: 'asc' },
        take: 20,
      },
    },
  })

  // Compute Jaccard similarity for each other user
  type TwinResult = {
    username: string
    similarity: number
    sharedCount: number
    sharedArtists: string[]
  }

  const results: TwinResult[] = []

  for (const other of otherUsers) {
    if (other.topArtists.length === 0) continue

    const otherArtistSet = new Set(other.topArtists.map((a) => a.name.toLowerCase()))

    // Intersection
    const intersection: string[] = []
    for (const artist of userArtistSet) {
      if (otherArtistSet.has(artist)) {
        intersection.push(artist)
      }
    }

    // Union size = |A| + |B| - |A ∩ B|
    const unionSize = userArtistSet.size + otherArtistSet.size - intersection.length

    if (unionSize === 0) continue

    const jaccard = intersection.length / unionSize

    results.push({
      username: other.lastfmUsername,
      similarity: Math.round(jaccard * 100),
      sharedCount: intersection.length,
      // Return the original-case names from the user's list
      sharedArtists: intersection
        .slice(0, 5)
        .map((lower) => {
          const match = user.topArtists.find((a) => a.name.toLowerCase() === lower)
          return match ? match.name : lower
        }),
    })
  }

  // Sort by similarity descending, take top 5
  results.sort((a, b) => b.similarity - a.similarity || b.sharedCount - a.sharedCount)
  const twins = results.slice(0, 5)

  return NextResponse.json({ twins })
}
