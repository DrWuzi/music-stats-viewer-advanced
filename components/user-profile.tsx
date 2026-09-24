'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  RotateCcw,
  X,
  User,
  Music,
  Disc,
  Mic2,
  Calendar,
  TrendingUp,
  Flame,
  Gauge,
  Compass,
  Activity,
  Star,
  Users2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NowPlaying } from '@/components/now-playing'
import { NowPlayingBanner } from '@/components/now-playing-banner'
import { ScrobbleToast } from '@/components/scrobble-toast'
import { ExportButton } from '@/components/export-button'
import { PrintButton } from '@/components/print-button'
import { CopyStatsButton } from '@/components/copy-stats-button'
import { CopyProfileUrl } from '@/components/copy-profile-url'
import { ShareProfileButton } from '@/components/share-profile-button'
import { LoyaltyScoreBadge } from '@/components/loyalty-score-badge'
import { MilestoneToast } from '@/components/milestone-toast'
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts'
import { KeyboardShortcutsModal } from '@/components/keyboard-shortcuts-modal'
import { TopStatsBanner } from '@/components/top-stats-banner'
import { DashboardProvider, useDashboard } from '@/components/dashboard-provider'
import { DashboardWidget } from '@/components/dashboard-widget'
import { DynamicTitle } from '@/components/dynamic-title'
import { ListeningGapAlert } from '@/components/listening-gap-alert'
import { PageContainer } from '@/components/page-container'
import { renderProfileWidget } from '@/components/profile-widget-registry'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/empty-state'
import { CATEGORY_ORDER, CATEGORY_LABELS, WIDGET_CATEGORIES, type WidgetCategory } from '@/lib/dashboard-widgets'
import type { WidgetId, WidgetSize } from '@/lib/dashboard-widgets'
import type { Period } from '@/lib/lastfm'

const CATEGORY_ICONS: Record<WidgetCategory, LucideIcon> = {
  overview: Gauge,
  trends: TrendingUp,
  taste: Compass,
  sessions: Activity,
  highlights: Star,
  social: Users2,
}

interface ProfileStats {
  uniqueArtists: number
  uniqueTracks: number
  uniqueAlbums: number
  scrobblesPerDay: number
  firstScrobbleAt: Date | null
}

interface UserProfileProps {
  username: string
  totalScrobbles: number
  registeredAt: Date
  imageUrl: string
  lastSyncedAt: Date | null
  isOwner: boolean
  recentTracks: { artist: string; album: string | null; track: string; scrobbledAt: Date }[]
  topArtists: Record<Period, { name: string; playcount: number; rank: number }[]>
  topAlbums: Record<Period, { name: string; artist: string; playcount: number; rank: number }[]>
  topTracks: Record<Period, { name: string; artist: string; playcount: number; rank: number }[]>
  lovedTracks: { artist: string; track: string; lovedAt: Date }[]
  allScrobbles: { scrobbledAt: Date; artist: string; track: string }[]
  profileStats?: ProfileStats
  initialDashboardOrder?: WidgetId[]
  initialDashboardHidden?: WidgetId[]
  initialDashboardSizes?: Partial<Record<WidgetId, WidgetSize>>
}

// ─── Inner component (uses context) ──────────────────────────────────────────

function toDateString(d: Date): string {
  return new Date(d).toISOString().slice(0, 10)
}

function computeLongestStreak(scrobbles: { scrobbledAt: Date | string }[]): number {
  if (scrobbles.length === 0) return 0
  const uniqueDates = Array.from(
    new Set(scrobbles.map((s) => toDateString(new Date(s.scrobbledAt))))
  ).sort()
  if (uniqueDates.length === 0) return 0
  let longest = 1
  let run = 1
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1])
    const curr = new Date(uniqueDates[i])
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      run++
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }
  return longest
}

// ─── Profile Stats Sidebar ────────────────────────────────────────────────────

function ProfileStatsSidebar({
  registeredAt,
  profileStats,
  allScrobbles,
}: {
  registeredAt: Date
  profileStats: ProfileStats | undefined
  allScrobbles: { scrobbledAt: Date | string }[]
}) {
  const longestStreak = useMemo(() => computeLongestStreak(allScrobbles), [allScrobbles])

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    {
      icon: <Calendar className="h-4 w-4" />,
      label: 'Member since',
      value: new Date(registeredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    },
  ]

  if (profileStats) {
    rows.push(
      {
        icon: <Mic2 className="h-4 w-4" />,
        label: 'Unique artists',
        value: profileStats.uniqueArtists.toLocaleString('en-US'),
      },
      {
        icon: <Music className="h-4 w-4" />,
        label: 'Unique tracks',
        value: profileStats.uniqueTracks.toLocaleString('en-US'),
      },
      {
        icon: <Disc className="h-4 w-4" />,
        label: 'Unique albums',
        value: profileStats.uniqueAlbums.toLocaleString('en-US'),
      },
      {
        icon: <TrendingUp className="h-4 w-4" />,
        label: 'Scrobbles / day',
        value: profileStats.scrobblesPerDay.toLocaleString('en-US'),
      },
    )
  }

  if (longestStreak > 0) {
    rows.push({
      icon: <Flame className="h-4 w-4" />,
      label: 'Longest streak',
      value: `${longestStreak} day${longestStreak === 1 ? '' : 's'}`,
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <User className="h-4 w-4" />
          Profile Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <dl className="space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
                <span style={{ color: 'color-mix(in oklch, var(--primary) 70%, transparent)' }}>{row.icon}</span>
                {row.label}
              </dt>
              <dd className="text-sm font-semibold tabular-nums text-right shrink-0">{row.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}


// ─── UserProfileContent ───────────────────────────────────────────────────────

function UserProfileContent({
  username,
  totalScrobbles,
  registeredAt,
  isOwner,
  recentTracks,
  topArtists,
  topAlbums,
  topTracks,
  lovedTracks,
  allScrobbles,
  profileStats,
}: UserProfileProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const period = (searchParams.get('period') as Period) || '7day'

  function setPeriod(p: Period) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', p)
    router.replace(`?${params.toString()}`)
  }

  const { order, hidden, sizes, isEditing, setEditing, reset } = useDashboard()

  // Persist visited username so compare page can offer "Paste my username"
  useEffect(() => {
    try { localStorage.setItem('lastfmMe', username) } catch { /* ignore */ }
  }, [username])

  const topArtistsOverall = topArtists['overall'] ?? []

  // Group the flat, user-customizable `order` into thematic sections. Category
  // is a fixed lookup per widget id, so drag/hide/resize still behaves exactly
  // as before — this only changes how the result is rendered.
  const groupedSections = useMemo(() => {
    const idsToRender = order.filter((id) => isEditing || !hidden.has(id))
    return CATEGORY_ORDER
      .map((category) => ({ category, ids: idsToRender.filter((id) => WIDGET_CATEGORIES[id] === category) }))
      .filter((group) => group.ids.length > 0)
  }, [order, hidden, isEditing])

  const [activeCategory, setActiveCategory] = useState<WidgetCategory | null>(null)
  const effectiveCategory =
    (activeCategory && groupedSections.some((g) => g.category === activeCategory) ? activeCategory : groupedSections[0]?.category) ?? null

  const todayCount = (() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return allScrobbles.filter((s) => new Date(s.scrobbledAt) >= startOfToday).length
  })()

  return (
    <PageContainer className="pb-8 pt-2">
      {/* Invisible/overlay components */}
      <DynamicTitle username={username} todayCount={todayCount} />
      <MilestoneToast totalScrobbles={totalScrobbles} />
      <ScrobbleToast username={username} />
      <KeyboardShortcuts isOwner={isOwner} />
      <KeyboardShortcutsModal />

      <NowPlaying />

      {/* Actions toolbar */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3 print:hidden">
        <CopyStatsButton username={username} totalScrobbles={totalScrobbles} topArtist={topArtistsOverall[0]?.name} />
        <CopyProfileUrl />
        <ShareProfileButton username={username} />
        {isOwner && <ExportButton username={username} />}
        <PrintButton />
        <div className="ml-auto flex items-center gap-1.5">
          <LoyaltyScoreBadge topArtists={topArtistsOverall} totalScrobbles={totalScrobbles} />
          {isOwner && (
            isEditing ? (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={reset} title="Reset to default layout">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button size="sm" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Done
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <LayoutDashboard className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Edit Layout</span>
              </Button>
            )
          )}
        </div>
      </div>

      {/* Now playing prominent banner */}
      <NowPlayingBanner />

      {/* Edit mode hint banner */}
      {isEditing && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-muted-foreground print:hidden">
          <LayoutDashboard className="h-4 w-4 text-primary shrink-0" />
          <span>
            Drag sections to reorder · use <strong>↑ ↓</strong> arrows · toggle <strong>👁</strong> to hide/show · your layout is saved automatically.
          </span>
        </div>
      )}

      {/* Stats banner */}
      <TopStatsBanner
        totalScrobbles={totalScrobbles}
        scrobbles={allScrobbles}
        topArtist={topArtistsOverall[0]?.name}
        username={username}
      />

      {/* Listening gap alert */}
      <ListeningGapAlert scrobbles={allScrobbles} username={username} />

      {/* Main content + sidebar layout. Stacked (sidebar below widgets) up to
          the lg breakpoint so the profile stats card is never hidden on
          tablets — only becomes a fixed-width sticky side column at lg+. */}
      <div className="flex flex-col gap-6 mt-6 items-start lg:flex-row">
        {/* Dashboard widgets, split into one tab per theme, in user-configured order within each */}
        <div className="w-full lg:flex-1 lg:min-w-0">
          {groupedSections.length === 0 ? (
            <EmptyState
              icon={LayoutDashboard}
              title="All widgets are hidden"
              description="Use Edit Layout to bring some back."
            />
          ) : (
            <Tabs value={effectiveCategory ?? undefined} onValueChange={(v) => setActiveCategory(v as WidgetCategory)}>
              <TabsList className="mb-5 gap-1 overflow-x-auto rounded-2xl border border-foreground/10 bg-background/40 p-1 backdrop-blur-md">
                {groupedSections.map(({ category, ids }) => {
                  const Icon = CATEGORY_ICONS[category]
                  const isActive = category === effectiveCategory
                  return (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className={cn(
                        "gap-1.5 rounded-md border border-transparent px-3 py-1.5 whitespace-nowrap transition-all duration-150",
                        isActive
                          ? "shadow-sm"
                          : "text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground",
                      )}
                      style={
                        isActive
                          ? {
                              background: 'color-mix(in oklch, var(--profile-accent, var(--primary)) 16%, var(--background))',
                              color: 'var(--profile-accent, var(--foreground))',
                              borderColor: 'color-mix(in oklch, var(--profile-accent, var(--primary)) 35%, transparent)',
                            }
                          : undefined
                      }
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {CATEGORY_LABELS[category]}
                      <span className={isActive ? "opacity-70" : "text-muted-foreground"}>{ids.length}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              {groupedSections.map(({ category, ids }) => (
                <TabsContent key={category} value={category}>
                  <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 auto-rows-min grid-flow-row-dense">
                    {ids.map((id) => (
                      <DashboardWidget key={id} id={id}>
                        {renderProfileWidget(id, sizes[id] ?? 2, {
                          username,
                          totalScrobbles,
                          registeredAt,
                          isOwner,
                          recentTracks,
                          topArtists,
                          topAlbums,
                          topTracks,
                          lovedTracks,
                          allScrobbles,
                          period,
                          onPeriodChange: setPeriod,
                        })}
                      </DashboardWidget>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        {/* Profile stats sidebar */}
        <aside className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-4">
          <ProfileStatsSidebar
            registeredAt={registeredAt}
            profileStats={profileStats}
            allScrobbles={allScrobbles}
          />
        </aside>
      </div>
    </PageContainer>
  )
}

// ─── Outer component (provides context) ──────────────────────────────────────

export function UserProfile(props: UserProfileProps) {
  return (
    <DashboardProvider
      isOwner={props.isOwner}
      initialOrder={props.initialDashboardOrder}
      initialHidden={props.initialDashboardHidden}
      initialSizes={props.initialDashboardSizes}
    >
      <UserProfileContent {...props} />
    </DashboardProvider>
  )
}
