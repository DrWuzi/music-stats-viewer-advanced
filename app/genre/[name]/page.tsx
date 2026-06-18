import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  params: Promise<{ name: string }>
  searchParams: Promise<{ user?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { name } = await params
  const tagName = decodeURIComponent(name)
  return { title: `${tagName} — Genre Deep Dive` }
}

export default async function GenreDetailPage({ params, searchParams }: Props) {
  const { name } = await params
  const sp = await searchParams
  const tagName = decodeURIComponent(name)
  const username = sp?.user ?? null

  const apiKey = process.env.LASTFM_API_KEY

  // Fetch Last.fm tag top artists
  const tagUrl = `https://ws.audioscrobbler.com/2.0/?method=tag.gettopartists&tag=${encodeURIComponent(tagName)}&api_key=${apiKey}&format=json&limit=50`
  const tagRes = await fetch(tagUrl, { next: { revalidate: 3600 } })
  const tagData = tagRes.ok ? await tagRes.json() : {}
  const tagArtists: { name: string }[] = tagData?.topartists?.artist ?? []

  // Build lowercased name -> index map
  const tagArtistMap = new Map<string, number>()
  tagArtists.forEach((a, idx) => {
    tagArtistMap.set(a.name.toLowerCase(), idx + 1)
  })

  // Fetch user matches if username provided
  type MatchArtist = { name: string; playcount: number; tagRank: number }
  let userMatches: MatchArtist[] = []
  let validUser = false

  if (username) {
    const user = await prisma.user.findUnique({
      where: { lastfmUsername: username },
      select: { id: true },
    })

    if (user) {
      validUser = true
      const userArtists = await prisma.topArtist.findMany({
        where: { userId: user.id, period: 'overall' },
        orderBy: { rank: 'asc' },
        select: { name: true, playcount: true },
      })

      userMatches = userArtists
        .filter((a) => tagArtistMap.has(a.name.toLowerCase()))
        .map((a) => ({
          name: a.name,
          playcount: a.playcount,
          tagRank: tagArtistMap.get(a.name.toLowerCase())!,
        }))
        .sort((a, b) => b.playcount - a.playcount)
    }
  }

  const maxPlaycount = userMatches.length > 0 ? userMatches[0].playcount : 1

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back link */}
      <div>
        {username ? (
          <Link
            href={`/user/${encodeURIComponent(username)}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {username}&apos;s profile
          </Link>
        ) : (
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Home
          </Link>
        )}
        <h1 className="text-3xl font-bold mt-2 capitalize">{tagName}</h1>
        {username && (
          <p className="text-sm text-muted-foreground mt-1">
            Genre deep dive for <strong>{username}</strong>
          </p>
        )}
      </div>

      {/* User artist matches */}
      {username && validUser && (
        <Card>
          <CardHeader>
            <CardTitle>
              Your {tagName} Artists
              {userMatches.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({userMatches.length} match{userMatches.length !== 1 ? 'es' : ''})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                None of your top artists appear in the Last.fm {tagName} tag list.
              </p>
            ) : (
              <div className="space-y-3">
                {userMatches.map(({ name, playcount, tagRank }) => {
                  const pct = (playcount / maxPlaycount) * 100
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <Link
                          href={`/artist/${encodeURIComponent(name)}?username=${encodeURIComponent(username!)}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {name}
                        </Link>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>#{tagRank} in tag</span>
                          <span>{playcount.toLocaleString()} plays</span>
                        </div>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: 'var(--muted)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: 'var(--primary)' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {username && !validUser && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">
              User <strong>{username}</strong> not found. Visit their profile first to sync data.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Last.fm tag top artists */}
      <Card>
        <CardHeader>
          <CardTitle>Top Artists Tagged &ldquo;{tagName}&rdquo; on Last.fm</CardTitle>
        </CardHeader>
        <CardContent>
          {tagArtists.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tag data available from Last.fm.</p>
          ) : (
            <ol className="space-y-1">
              {tagArtists.slice(0, 20).map((artist, idx) => (
                <li key={artist.name} className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm w-6 text-right shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-sm flex-1">{artist.name}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Back link at bottom */}
      <div className="pt-2">
        {username ? (
          <Link
            href={`/user/${encodeURIComponent(username)}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to {username}&apos;s profile
          </Link>
        ) : (
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Link>
        )}
      </div>
    </main>
  )
}

export const dynamic = 'force-dynamic'
