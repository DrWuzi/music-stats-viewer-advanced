import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { lastfmClient } from '@/lib/lastfm'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Sparkles } from 'lucide-react'
import { BackButton } from '@/components/back-button'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata = { title: 'Discover — Last.fm Advanced' }

interface RecommendedArtist {
  name: string
  similarTo: string
  matchScore: number
}

export default async function DiscoverPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: session.lastfmUsername },
    select: { id: true },
  })
  if (!user) redirect('/login')

  // Get user's top 10 overall artists from DB
  const topArtistsDb = await prisma.topArtist.findMany({
    where: { userId: user.id, period: 'overall' },
    orderBy: { rank: 'asc' },
    take: 10,
  })

  const knownArtistNames = new Set(topArtistsDb.map((a) => a.name.toLowerCase()))

  // For top 5, fetch similar artists in parallel
  const top5 = topArtistsDb.slice(0, 5)
  const similarResults = await Promise.allSettled(
    top5.map((a) =>
      lastfmClient.getSimilarArtists(a.name, 10).then((similars) => ({
        sourceArtist: a.name,
        similars,
      })),
    ),
  )

  // Aggregate: collect all similar artists not already in the user's top list
  const scored: Record<string, { totalMatch: number; count: number; similarTo: string }> = {}

  for (const result of similarResults) {
    if (result.status !== 'fulfilled') continue
    const { sourceArtist, similars } = result.value
    for (const s of similars) {
      if (knownArtistNames.has(s.name.toLowerCase())) continue
      if (!scored[s.name]) {
        scored[s.name] = { totalMatch: 0, count: 0, similarTo: sourceArtist }
      }
      scored[s.name].totalMatch += s.match
      scored[s.name].count += 1
    }
  }

  // Rank by average match score
  const recommendations: RecommendedArtist[] = Object.entries(scored)
    .map(([name, { totalMatch, count, similarTo }]) => ({
      name,
      similarTo,
      matchScore: totalMatch / count,
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 20)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <BackButton />
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Discover</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Artists you might love, based on your listening history
        </p>
      </div>

      {/* Recommendations */}
      <section className="mb-10">
        <h2 className="text-base font-semibold mb-4">Based on your listening</h2>

        {recommendations.length === 0 ? (
          <div className="rounded-xl border p-8 text-center text-muted-foreground">
            <EmptyState
              icon={Sparkles}
              title="No recommendations yet."
              description="Keep scrobbling and sync your data to get personalized picks."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {recommendations.map((artist) => (
              <Card key={artist.name} className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-4 pb-4">
                  <Link
                    href={`/artist/${encodeURIComponent(artist.name)}`}
                    className="block font-semibold text-sm hover:underline truncate mb-1"
                  >
                    {artist.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Similar to{' '}
                    <Link
                      href={`/artist/${encodeURIComponent(artist.similarTo)}`}
                      className="hover:underline"
                    >
                      {artist.similarTo}
                    </Link>
                  </p>
                  <div className="mt-2">
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${Math.round(artist.matchScore * 100)}%`,
                        background: 'var(--primary)',
                        opacity: 0.6,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Music Twins promo */}
      <section>
        <div
          className="rounded-xl border p-6 flex items-center gap-4"
          style={{ background: 'color-mix(in oklch, var(--primary) 5%, transparent)' }}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in oklch, var(--primary) 15%, transparent)' }}
          >
            <Users className="h-5 w-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Find your music twin</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compare your taste with friends and see how compatible your music libraries are.
            </p>
          </div>
          <Link
            href="/compare"
            className="shrink-0 text-sm font-medium hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Compare
          </Link>
        </div>
      </section>

      {/* Your top artists for context */}
      {topArtistsDb.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold mb-4">
            Your top artists{' '}
            <Badge variant="secondary" className="ml-1">overall</Badge>
          </h2>
          <div className="flex flex-wrap gap-2">
            {topArtistsDb.map((a) => (
              <Link
                key={a.name}
                href={`/artist/${encodeURIComponent(a.name)}`}
                className="px-3 py-1 rounded-full text-sm border hover:border-primary/50 transition-colors"
              >
                {a.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
