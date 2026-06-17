import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SearchForm } from './SearchForm'

type Props = {
  searchParams?: Promise<{ a?: string; b?: string }>
}

export const metadata = { title: 'Compare Users — Last.fm Advanced' }

function compatibilityLabel(score: number): string {
  if (score > 50) return 'Music Twins!'
  if (score >= 20) return 'Some overlap'
  return 'Different taste'
}

function compatibilityColor(score: number): string {
  if (score > 50) return 'text-green-500'
  if (score >= 20) return 'text-yellow-500'
  return 'text-red-500'
}

export default async function ComparePage({ searchParams }: Props) {
  const sp = await searchParams
  const a = sp?.a?.trim()
  const b = sp?.b?.trim()

  if (!a || !b) {
    return (
      <main className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-lg mx-auto space-y-6">
          <div>
            <Link href="/" className="text-muted-foreground hover:text-foreground text-sm mb-2 inline-block">
              ← Back to home
            </Link>
            <h1 className="text-3xl font-bold">Compare Users</h1>
            <p className="text-muted-foreground mt-1">
              Find out how compatible two Last.fm listeners are.
            </p>
          </div>
          <SearchForm defaultA={a ?? ''} defaultB={b ?? ''} />
        </div>
      </main>
    )
  }

  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({
      where: { lastfmUsername: a },
      include: {
        topArtists: { where: { period: 'overall' }, orderBy: { rank: 'asc' }, take: 10 },
        _count: { select: { scrobbles: true } },
      },
    }),
    prisma.user.findUnique({
      where: { lastfmUsername: b },
      include: {
        topArtists: { where: { period: 'overall' }, orderBy: { rank: 'asc' }, take: 10 },
        _count: { select: { scrobbles: true } },
      },
    }),
  ])

  const missingUsers: string[] = []
  if (!userA) missingUsers.push(a)
  if (!userB) missingUsers.push(b)

  if (missingUsers.length > 0) {
    return (
      <main className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-lg mx-auto space-y-6">
          <div>
            <Link href="/compare" className="text-muted-foreground hover:text-foreground text-sm mb-2 inline-block">
              ← Try again
            </Link>
            <h1 className="text-3xl font-bold">Compare Users</h1>
          </div>
          {missingUsers.map((name) => (
            <div key={name} className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-destructive font-medium">
                User &quot;{name}&quot; not found — visit{' '}
                <Link href={`/user/${name}`} className="underline">
                  /user/{name}
                </Link>{' '}
                first to sync their data.
              </p>
            </div>
          ))}
          <SearchForm defaultA={a} defaultB={b} />
        </div>
      </main>
    )
  }

  const setA = new Set(userA!.topArtists.map((t) => t.name))
  const setB = new Set(userB!.topArtists.map((t) => t.name))

  const intersection = [...setA].filter((name) => setB.has(name))
  const union = new Set([...setA, ...setB])
  const jaccardScore = union.size > 0 ? Math.round((intersection.length / union.size) * 100) : 0

  const label = compatibilityLabel(jaccardScore)
  const labelColor = compatibilityColor(jaccardScore)

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href="/compare" className="text-muted-foreground hover:text-foreground text-sm mb-2 inline-block">
            ← New comparison
          </Link>
          <h1 className="text-3xl font-bold">
            {a} vs {b}
          </h1>
        </div>

        {/* Compatibility score */}
        <div className="rounded-2xl border bg-card p-8 text-center space-y-2">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">
            Compatibility Score
          </p>
          <p className={`text-7xl font-black ${labelColor}`}>{jaccardScore}%</p>
          <p className="text-xl font-semibold">{label}</p>
          <p className="text-sm text-muted-foreground">
            Based on top 10 artists (Jaccard similarity)
          </p>
        </div>

        {/* Side by side */}
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { user: userA!, name: a },
            { user: userB!, name: b },
          ].map(({ user, name }) => (
            <Card key={name}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <Link
                    href={`/user/${name}`}
                    className="hover:underline"
                  >
                    {name}
                  </Link>
                  <span className="text-sm font-normal text-muted-foreground">
                    {user._count.scrobbles.toLocaleString()} scrobbles
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user.topArtists.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No top artist data available.</p>
                ) : (
                  <ol className="space-y-2">
                    {user.topArtists.map((artist, i) => (
                      <li key={artist.id} className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6 shrink-0">
                          {i + 1}
                        </span>
                        <span
                          className={`flex-1 text-sm truncate ${
                            intersection.includes(artist.name) ? 'font-semibold' : ''
                          }`}
                        >
                          {artist.name}
                        </span>
                        {intersection.includes(artist.name) && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            shared
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Shared artists */}
        {intersection.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle>Shared Artists ({intersection.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {intersection.map((artist) => (
                  <Badge key={artist} variant="default">
                    {artist}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {intersection.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No shared artists in the top 10 lists.
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <SearchForm defaultA={a} defaultB={b} />
        </div>
      </div>
    </main>
  )
}
