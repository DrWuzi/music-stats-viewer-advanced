import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Props = {
  params: Promise<{ username: string }>
  searchParams?: Promise<{
    page?: string
    per_page?: string
    artist?: string
    q?: string
  }>
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username}'s History — Last.fm Advanced` }
}

export default async function HistoryPage({ params, searchParams }: Props) {
  const { username } = await params
  const sp = await searchParams

  const page = Math.max(1, Number(sp?.page ?? 1))
  const perPage = Math.min(200, Math.max(10, Number(sp?.per_page ?? 50)))
  const artistFilter = sp?.artist?.trim() ?? ''
  const searchQuery = sp?.q?.trim() ?? ''

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username } })

  if (!user) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <p className="text-destructive text-lg font-medium">User not found</p>
          <p className="text-muted-foreground">
            No data found for <strong>{username}</strong>.
          </p>
          <Link href="/" className={cn(buttonVariants({ variant: 'outline' }), 'mt-2')}>
            ← Back to home
          </Link>
        </div>
      </main>
    )
  }

  // Build the where filter
  const where = {
    userId: user.id,
    ...(artistFilter
      ? { artist: { equals: artistFilter, mode: 'insensitive' as const } }
      : {}),
    ...(searchQuery
      ? {
          OR: [
            { track: { contains: searchQuery, mode: 'insensitive' as const } },
            { artist: { contains: searchQuery, mode: 'insensitive' as const } },
            { album: { contains: searchQuery, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [totalScrobbles, scrobbles, artistOptions] = await Promise.all([
    prisma.scrobble.count({ where }),
    prisma.scrobble.findMany({
      where,
      orderBy: { scrobbledAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    // Fetch distinct artists for the dropdown (top 100 by count)
    prisma.scrobble
      .groupBy({
        by: ['artist'],
        where: { userId: user.id },
        _count: { artist: true },
        orderBy: { _count: { artist: 'desc' } },
        take: 100,
      })
      .then((rows) => rows.map((r) => r.artist)),
  ])

  const totalPages = Math.max(1, Math.ceil(totalScrobbles / perPage))
  const currentPage = Math.min(page, totalPages)

  // Helper to build URLs preserving all filters
  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (p !== 1) params.set('page', String(p))
    if (perPage !== 50) params.set('per_page', String(perPage))
    if (artistFilter) params.set('artist', artistFilter)
    if (searchQuery) params.set('q', searchQuery)
    const qs = params.toString()
    return `/user/${username}/history${qs ? `?${qs}` : ''}`
  }

  const isFiltered = Boolean(artistFilter || searchQuery)

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link
            href={`/user/${username}`}
            className="text-muted-foreground hover:text-foreground text-sm mb-2 inline-block transition-colors"
          >
            ← Back to profile
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{username}&apos;s History</h1>
            <Badge variant="secondary" className="text-sm font-normal">
              {totalScrobbles.toLocaleString()} scrobble{totalScrobbles !== 1 ? 's' : ''}
              {isFiltered ? ' (filtered)' : ''}
            </Badge>
          </div>
        </div>

        {/* Filter Bar */}
        <form method="GET" className="flex flex-col sm:flex-row gap-3">
          {/* Search input */}
          <div className="flex-1">
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search tracks, artists, albums…"
              className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          {/* Artist filter dropdown */}
          <div className="sm:w-56">
            <select
              name="artist"
              defaultValue={artistFilter}
              className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="">All artists</option>
              {artistOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Per-page selector */}
          <div className="sm:w-32">
            <select
              name="per_page"
              defaultValue={String(perPage)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={String(n)}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className={cn(buttonVariants({ variant: 'default' }), 'shrink-0')}>
            Filter
          </button>

          {isFiltered && (
            <Link
              href={`/user/${username}/history`}
              className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0')}
            >
              Clear
            </Link>
          )}
        </form>

        {/* Table Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base font-medium">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              {totalScrobbles > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {((currentPage - 1) * perPage + 1).toLocaleString()}–
                  {Math.min(currentPage * perPage, totalScrobbles).toLocaleString()} of{' '}
                  {totalScrobbles.toLocaleString()}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {scrobbles.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center">
                {isFiltered ? 'No scrobbles match your filters.' : 'No scrobbles found.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ background: 'color-mix(in oklch, var(--muted) 60%, transparent)' }}>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                        Time
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Track
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Artist
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                        Album
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scrobbles.map((scrobble) => (
                      <tr
                        key={scrobble.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap text-xs">
                          {scrobble.scrobbledAt.toLocaleString('en-US', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">
                          <Link
                            href={`/track/${encodeURIComponent(scrobble.artist)}/${encodeURIComponent(scrobble.track)}`}
                            className="hover:text-primary transition-colors hover:underline"
                          >
                            {scrobble.track}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 max-w-[160px] truncate">
                          <Link
                            href={`/artist/${encodeURIComponent(scrobble.artist)}`}
                            className="hover:text-primary transition-colors hover:underline"
                          >
                            {scrobble.artist}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground max-w-[160px] truncate hidden sm:table-cell">
                          {scrobble.album ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-4">
          {currentPage > 1 ? (
            <Link href={pageUrl(currentPage - 1)} className={cn(buttonVariants({ variant: 'outline' }))}>
              ← Previous
            </Link>
          ) : (
            <span className={cn(buttonVariants({ variant: 'outline' }), 'pointer-events-none opacity-40')}>
              ← Previous
            </span>
          )}

          {/* Page number quick-jump area */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {totalPages <= 7 ? (
              Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageUrl(p)}
                  className={cn(
                    'inline-flex items-center justify-center rounded-md w-8 h-8 text-sm transition-colors',
                    p === currentPage
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted',
                  )}
                >
                  {p}
                </Link>
              ))
            ) : (
              <span>
                Page {currentPage} of {totalPages.toLocaleString()}
              </span>
            )}
          </div>

          {currentPage < totalPages ? (
            <Link href={pageUrl(currentPage + 1)} className={cn(buttonVariants({ variant: 'outline' }))}>
              Next →
            </Link>
          ) : (
            <span className={cn(buttonVariants({ variant: 'outline' }), 'pointer-events-none opacity-40')}>
              Next →
            </span>
          )}
        </div>
      </div>
    </main>
  )
}
