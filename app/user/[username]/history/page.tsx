import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  params: Promise<{ username: string }>
  searchParams?: Promise<{ page?: string }>
}

const PAGE_SIZE = 100

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  return { title: `${username}'s History — Last.fm Advanced` }
}

export default async function HistoryPage({ params, searchParams }: Props) {
  const { username } = await params
  const sp = await searchParams
  const page = Math.max(1, Number(sp?.page ?? 1))

  const user = await prisma.user.findUnique({ where: { lastfmUsername: username } })

  if (!user) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-destructive text-lg">User not found</p>
          <Link href="/" className="text-primary underline mt-4 inline-block">
            ← Back to home
          </Link>
        </div>
      </main>
    )
  }

  const totalScrobbles = await prisma.scrobble.count({ where: { userId: user.id } })
  const totalPages = Math.max(1, Math.ceil(totalScrobbles / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const scrobbles = await prisma.scrobble.findMany({
    where: { userId: user.id },
    orderBy: { scrobbledAt: 'desc' },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/user/${username}`}
              className="text-muted-foreground hover:text-foreground text-sm mb-2 inline-block"
            >
              ← Back to profile
            </Link>
            <h1 className="text-3xl font-bold">{username}&apos;s History</h1>
            <p className="text-muted-foreground mt-1">
              {totalScrobbles.toLocaleString()} total scrobbles
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, totalScrobbles)} of{' '}
                {totalScrobbles.toLocaleString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {scrobbles.length === 0 ? (
              <p className="text-muted-foreground p-6">No scrobbles found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Time
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Track
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Artist
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
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
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {scrobble.scrobbledAt.toLocaleString('en-US', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-4 py-3 font-medium">{scrobble.track}</td>
                        <td className="px-4 py-3">{scrobble.artist}</td>
                        <td className="px-4 py-3 text-muted-foreground">
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

        <div className="flex items-center justify-between">
          {currentPage > 1 ? (
            <Link
              href={`/user/${username}/history?page=${currentPage - 1}`}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Previous
            </Link>
          ) : (
            <span
              className={cn(buttonVariants({ variant: 'outline' }), 'pointer-events-none opacity-50')}
            >
              Previous
            </span>
          )}

          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>

          {currentPage < totalPages ? (
            <Link
              href={`/user/${username}/history?page=${currentPage + 1}`}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Next
            </Link>
          ) : (
            <span
              className={cn(buttonVariants({ variant: 'outline' }), 'pointer-events-none opacity-50')}
            >
              Next
            </span>
          )}
        </div>
      </div>
    </main>
  )
}
