import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Top Listeners — Last.fm Advanced' }

const MEDAL: Record<number, { label: string; className: string }> = {
  1: { label: '1st', className: 'bg-yellow-400 text-yellow-900 hover:bg-yellow-400' },
  2: { label: '2nd', className: 'bg-slate-400 text-slate-900 hover:bg-slate-400' },
  3: { label: '3rd', className: 'bg-amber-700 text-amber-100 hover:bg-amber-700' },
}

export default async function LeaderboardPage() {
  const users = await prisma.user.findMany({
    where: { lastSyncedAt: { not: null } },
    select: { lastfmUsername: true, _count: { select: { scrobbles: true } } },
    orderBy: { scrobbles: { _count: 'desc' } },
    take: 50,
  })

  const ranked = users.map((u, i) => ({
    lastfmUsername: u.lastfmUsername,
    scrobbleCount: u._count.scrobbles,
    rank: i + 1,
  }))

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Home
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Top Listeners</CardTitle>
        </CardHeader>
        <CardContent>
          {ranked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No listeners yet. Be the first!</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2 font-medium text-muted-foreground w-16">Rank</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">Username</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground">Scrobbles</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((u) => {
                  const medal = MEDAL[u.rank]
                  return (
                    <tr key={u.lastfmUsername} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        {medal ? (
                          <Badge className={medal.className}>{medal.label}</Badge>
                        ) : (
                          <span className="text-muted-foreground pl-1">#{u.rank}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/user/${u.lastfmUsername}`}
                          className="font-medium hover:underline"
                        >
                          {u.lastfmUsername}
                        </Link>
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {u.scrobbleCount.toLocaleString('en-US')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
