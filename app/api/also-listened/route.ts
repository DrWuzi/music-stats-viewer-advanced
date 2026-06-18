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

  const scrobbles = await prisma.scrobble.findMany({
    where: { userId: user.id },
    select: { scrobbledAt: true, artist: true },
    orderBy: { scrobbledAt: 'desc' },
    take: 5000,
  })

  // Group scrobbles by date (YYYY-MM-DD)
  const byDate: Record<string, string[]> = {}
  for (const s of scrobbles) {
    const key = new Date(s.scrobbledAt).toISOString().slice(0, 10)
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(s.artist)
  }

  const artistLower = artist.toLowerCase()

  // Find dates where the target artist appears
  const coArtistCounts: Record<string, number> = {}
  for (const [, artists] of Object.entries(byDate)) {
    const hasTargetArtist = artists.some((a) => a.toLowerCase() === artistLower)
    if (!hasTargetArtist) continue

    // Count other artists on that date (deduplicate per day per artist)
    const otherArtists = new Set(
      artists
        .filter((a) => a.toLowerCase() !== artistLower)
        .map((a) => a)
    )
    for (const a of otherArtists) {
      coArtistCounts[a] = (coArtistCounts[a] ?? 0) + 1
    }
  }

  // Sort by count desc, return top 10
  const top10 = Object.entries(coArtistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, sharedDays]) => ({ name, sharedDays }))

  return Response.json(top10)
}
