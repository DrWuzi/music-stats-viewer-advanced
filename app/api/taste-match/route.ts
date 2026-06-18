import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')
  const artist = searchParams.get('artist')

  if (!username || !artist) {
    return Response.json({ error: 'Missing username or artist parameter' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username } })
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  const encodedArtist = encodeURIComponent(artist)
  const apiKey = process.env.LASTFM_API_KEY
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodedArtist}&api_key=${apiKey}&format=json&limit=30`

  let similarArtists: string[] = []
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch similar artists from Last.fm' }, { status: 502 })
    }
    const data = await res.json()
    if (data.error) {
      return Response.json({ error: data.message ?? 'Last.fm API error' }, { status: 502 })
    }
    similarArtists = (data.similarartists?.artist ?? []).map((a: { name: string }) => a.name as string)
  } catch {
    return Response.json({ error: 'Network error fetching similar artists' }, { status: 502 })
  }

  const userTopArtists = await prisma.topArtist.findMany({
    where: { userId: user.id, period: 'overall' },
    select: { name: true },
  })

  const userArtistSet = new Set(userTopArtists.map((a) => a.name.toLowerCase()))
  const matchingArtists = similarArtists.filter((name) => userArtistSet.has(name.toLowerCase()))

  const totalSimilar = similarArtists.length
  const score = totalSimilar > 0
    ? Math.round((matchingArtists.length / Math.min(30, totalSimilar)) * 100)
    : 0

  return Response.json({
    score,
    matchingArtists,
    totalSimilar,
    artistName: artist,
  })
}
