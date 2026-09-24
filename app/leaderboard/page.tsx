import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnimatedNumber } from '@/components/animated-number'
import { Crown, Medal, Users, Music2, Clock } from 'lucide-react'
import { BackButton } from '@/components/back-button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageContainer } from '@/components/page-container'

export const metadata = { title: 'Top Listeners — Last.fm Advanced' }

const MEDAL_CONFIG: Record<
  number,
  { emoji: string; badgeClass: string; rowClass: string }
> = {
  1: {
    emoji: '🥇',
    badgeClass:
      'bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 border-yellow-400/40 hover:bg-yellow-400/20',
    rowClass: 'bg-yellow-400/5',
  },
  2: {
    emoji: '🥈',
    badgeClass:
      'bg-slate-400/20 text-slate-600 dark:text-slate-300 border-slate-400/40 hover:bg-slate-400/20',
    rowClass: 'bg-slate-400/5',
  },
  3: {
    emoji: '🥉',
    badgeClass:
      'bg-amber-700/20 text-amber-800 dark:text-amber-300 border-amber-600/40 hover:bg-amber-700/20',
    rowClass: 'bg-amber-700/5',
  },
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 1) return 'today'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

export default async function LeaderboardPage() {
  const users = await prisma.user.findMany({
    include: { _count: { select: { scrobbles: true } } },
    orderBy: { scrobbles: { _count: 'desc' } },
    take: 50,
  })

  const ranked = users.map((u, i) => ({
    lastfmUsername: u.lastfmUsername,
    scrobbleCount: u._count.scrobbles,
    createdAt: u.createdAt,
    lastSyncedAt: u.lastSyncedAt,
    rank: i + 1,
  }))

  const totalScrobbles = ranked.reduce((sum, u) => sum + u.scrobbleCount, 0)
  const lastUpdated = new Date()

  return (
    <PageContainer maxWidth="3xl" className="py-8">
      <BackButton />

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Crown className="size-8 text-yellow-500" />
          Top Listeners
        </h1>
        <p className="text-muted-foreground text-sm">
          The most dedicated scrobblers in the community.
        </p>
      </div>

      {/* Community stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Members</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              <AnimatedNumber value={ranked.length} />
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Music2 className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Scrobbles</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              <AnimatedNumber value={totalScrobbles} />
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Updated</span>
            </div>
            <p className="text-sm font-medium">{formatDate(lastUpdated)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Medal className="size-5" />
            Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ranked.length === 0 ? (
            <EmptyState icon={Users} title="No listeners yet. Be the first!" />
          ) : (
            <div className="divide-y divide-foreground/10">
              {/* Header row */}
              <div className="grid grid-cols-[3rem_1fr_auto_auto] gap-x-4 items-center px-6 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Rank</span>
                <span>User</span>
                <span className="text-right hidden sm:block">Joined</span>
                <span className="text-right">Scrobbles</span>
              </div>

              {ranked.map((u) => {
                const medal = MEDAL_CONFIG[u.rank]

                return (
                  <div
                    key={u.lastfmUsername}
                    className={`grid grid-cols-[3rem_1fr_auto_auto] gap-x-4 items-center px-6 py-3 transition-colors hover:bg-muted/40 ${medal?.rowClass ?? ''}`}
                  >
                    {/* Rank */}
                    <div className="flex items-center gap-1">
                      {u.rank === 1 && (
                        <Crown className="size-4 text-yellow-500 shrink-0" aria-hidden="true" />
                      )}
                      {medal ? (
                        <Badge
                          variant="outline"
                          className={`text-xs px-1.5 py-0 ${medal.badgeClass}`}
                        >
                          {medal.emoji}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm tabular-nums pl-1">
                          #{u.rank}
                        </span>
                      )}
                    </div>

                    {/* Username */}
                    <div className="min-w-0">
                      <Link
                        href={`/user/${u.lastfmUsername}`}
                        className="font-medium hover:underline truncate block"
                      >
                        {u.lastfmUsername}
                      </Link>
                      {u.lastSyncedAt && (
                        <span className="text-xs text-muted-foreground">
                          synced {formatRelativeDate(u.lastSyncedAt)}
                        </span>
                      )}
                    </div>

                    {/* Join date */}
                    <div className="text-right hidden sm:block">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </span>
                    </div>

                    {/* Scrobble count */}
                    <div className="text-right tabular-nums font-semibold text-sm">
                      <AnimatedNumber value={u.scrobbleCount} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center mt-6">
        Showing top {ranked.length} scrobblers &middot; Last updated {formatDate(lastUpdated)}
      </p>
    </PageContainer>
  )
}
