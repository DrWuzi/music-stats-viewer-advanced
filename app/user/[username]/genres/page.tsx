import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'

type Props = { params: Promise<{ username: string }> }

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const YEAR_COLORS = [
  'border-violet-500',
  'border-blue-500',
  'border-cyan-500',
  'border-emerald-500',
  'border-amber-500',
  'border-rose-500',
  'border-pink-500',
  'border-orange-500',
]

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username}'s Genre Eras — Last.fm Advanced` }
}

export default async function GenresPage({ params }: Props) {
  const { username } = await params

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { id: true },
  })

  if (!user) notFound()

  const scrobbles = await prisma.scrobble.findMany({
    where: { userId: user.id },
    select: { artist: true, scrobbledAt: true },
  })

  if (scrobbles.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Link href={`/user/${username}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            &larr; {username}&apos;s profile
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-6">Genre Eras</h1>
        <p className="text-muted-foreground">No scrobbles found.</p>
      </div>
    )
  }

  // Group by year then artist counts
  const byYear: Record<number, Record<string, number>> = {}
  for (const s of scrobbles) {
    const year = s.scrobbledAt.getFullYear()
    if (!byYear[year]) byYear[year] = {}
    byYear[year][s.artist] = (byYear[year][s.artist] ?? 0) + 1
  }

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
        if (topTag) artistTagMap[artist] = topTag.name
      }
    } catch {
      // skip
    }
    await sleep(200)
  }

  const eras = years.map((year) => {
    const topArtists = eraArtistsMap[year]
    const topTag = topArtists.map((a) => artistTagMap[a]).find(Boolean) ?? 'unknown'
    return { year, topArtists, topTag }
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link href={`/user/${username}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; {username}&apos;s profile
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-8">Genre Eras</h1>

      {eras.length === 0 ? (
        <p className="text-muted-foreground">Not enough data to show genre eras.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {eras.map((era, idx) => {
            const colorClass = YEAR_COLORS[idx % YEAR_COLORS.length]
            return (
              <div
                key={era.year}
                className={`border-l-4 pl-5 ${colorClass}`}
              >
                <div className="text-3xl font-bold tracking-tight mb-2">{era.year}</div>
                <ul className="mb-3 space-y-0.5">
                  {era.topArtists.map((artist) => (
                    <li key={artist} className="text-sm font-medium">
                      {artist}
                    </li>
                  ))}
                </ul>
                <Badge variant="secondary" className="capitalize">
                  {era.topTag}
                </Badge>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
