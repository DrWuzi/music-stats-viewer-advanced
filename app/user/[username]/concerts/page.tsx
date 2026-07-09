import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, ExternalLink, Calendar } from 'lucide-react'
import { ArtistImage } from '@/components/artist-image'
import { SortControl } from '@/components/sort-control'
import { EmptyState } from '@/components/ui/empty-state'

type Props = {
  params: Promise<{ username: string }>
  searchParams?: Promise<{ sort?: string }>
}

type ConcertSort = 'date_soonest' | 'artist_az'

const SORT_OPTIONS: { value: ConcertSort; label: string }[] = [
  { value: 'date_soonest', label: 'Soonest first' },
  { value: 'artist_az', label: 'Artist A–Z' },
]

const VALID_SORTS = new Set<ConcertSort>(['date_soonest', 'artist_az'])

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username} — Concerts — Last.fm Advanced` }
}

interface BandsInTownEvent {
  datetime: string
  title: string
  venue: { name: string; city: string; country: string }
}

interface ArtistEvents {
  artist: string
  events: BandsInTownEvent[]
}

async function fetchArtistEvents(artist: string, appId: string): Promise<BandsInTownEvent[]> {
  try {
    const encoded = encodeURIComponent(artist)
    const res = await fetch(
      `https://rest.bandsintown.com/artists/${encoded}/events?app_id=${appId}`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    const now = new Date()
    return data
      .filter((e: BandsInTownEvent) => new Date(e.datetime) > now)
      .sort((a: BandsInTownEvent, b: BandsInTownEvent) =>
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
      )
      .slice(0, 5)
  } catch {
    return []
  }
}

async function fetchConcurrent<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(batch.map((t) => t()))
    for (const r of batchResults) {
      if (r.status === 'fulfilled') results.push(r.value)
    }
  }
  return results
}

export default async function ConcertsPage({ params, searchParams }: Props) {
  const { username } = await params
  const sp = await searchParams
  const sort: ConcertSort = VALID_SORTS.has(sp?.sort as ConcertSort)
    ? (sp!.sort as ConcertSort)
    : 'date_soonest'

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { id: true },
  })
  if (!user) notFound()

  const topArtists = await prisma.topArtist.findMany({
    where: { userId: user.id, period: 'overall' },
    orderBy: { rank: 'asc' },
    take: 15,
  })

  const appId = process.env.BANDSINTOWN_APP_ID
  const hasApiKey = Boolean(appId)

  let artistEvents: ArtistEvents[] = []

  if (hasApiKey && appId) {
    const tasks = topArtists.map(
      (a) => () =>
        fetchArtistEvents(a.name, appId).then((events) => ({
          artist: a.name,
          events,
        })),
    )
    artistEvents = await fetchConcurrent(tasks, 5)
  }

  // Sort the artist-events list. 'date_soonest' orders by each artist's
  // nearest upcoming event (artists with no events sort last); 'artist_az'
  // ignores dates and sorts alphabetically.
  const sortedArtistEvents = [...artistEvents].sort((a, b) => {
    if (sort === 'artist_az') return a.artist.localeCompare(b.artist)
    const aTime = a.events[0] ? new Date(a.events[0].datetime).getTime() : Infinity
    const bTime = b.events[0] ? new Date(b.events[0].datetime).getTime() : Infinity
    return aTime - bTime
  })

  const sortedTopArtists =
    sort === 'artist_az'
      ? [...topArtists].sort((a, b) => a.name.localeCompare(b.name))
      : topArtists

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6" style={{ color: 'var(--primary)' }} />
            Concerts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upcoming shows from artists you love
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by</span>
          <SortControl options={SORT_OPTIONS} defaultValue="date_soonest" />
        </div>
      </div>

      {!hasApiKey && (
        <div
          className="mb-6 rounded-xl border px-4 py-3 text-sm"
          style={{
            background: 'color-mix(in oklch, var(--primary) 5%, transparent)',
            borderColor: 'color-mix(in oklch, var(--primary) 25%, transparent)',
          }}
        >
          <p className="font-medium">Want live event dates?</p>
          <p className="text-muted-foreground mt-0.5">
            Add <code className="text-xs bg-muted px-1 py-0.5 rounded">BANDSINTOWN_APP_ID</code> to
            your environment variables to see upcoming shows directly here.
          </p>
        </div>
      )}

      {hasApiKey ? (
        /* Live event data */
        <div className="space-y-6">
          {sortedArtistEvents.map(({ artist, events }) => (
            <Card key={artist}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ArtistImage name={artist} size="xs" />
                  <CardTitle className="text-base">{artist}</CardTitle>
                  {events.length > 0 && (
                    <Badge variant="secondary">{events.length} upcoming</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {events.length === 0 ? (
                  <EmptyState icon={Calendar} title="No upcoming events found" />
                ) : (
                  <ul className="space-y-3">
                    {events.map((event, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: 'color-mix(in oklch, var(--primary) 10%, transparent)' }}
                        >
                          <Calendar className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{event.venue.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.venue.city}, {event.venue.country} · {fmtDate(event.datetime)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* No API key — show links */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sortedTopArtists.map((artist) => (
            <Card key={artist.name}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ArtistImage name={artist.name} size="xs" />
                  <CardTitle className="text-sm font-semibold">{artist.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col gap-1.5">
                <a
                  href={`https://www.bandsintown.com/a/${encodeURIComponent(artist.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  Bandsintown
                </a>
                <a
                  href={`https://www.songkick.com/search?query=${encodeURIComponent(artist.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  Songkick
                </a>
                <a
                  href={`https://www.last.fm/music/${encodeURIComponent(artist.name)}/+events`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  Last.fm Events
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {topArtists.length === 0 && (
        <div className="rounded-xl border p-8 text-center text-muted-foreground">
          <p className="text-sm">No top artists found. Sync your scrobbles first.</p>
          <Link href={`/user/${username}`} className="text-xs mt-2 block hover:underline" style={{ color: 'var(--primary)' }}>
            Go to profile
          </Link>
        </div>
      )}
    </div>
  )
}
