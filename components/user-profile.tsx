'use client'

import { useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutDashboard, RotateCcw, X, User, Music, Disc, Mic2, Calendar, TrendingUp, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RecentTracks } from '@/components/recent-tracks'
import { TopLists } from '@/components/top-lists'
import { LovedTracks } from '@/components/loved-tracks'
import { StatsChart } from '@/components/stats-chart'
import { NowPlaying } from '@/components/now-playing'
import { NowPlayingBanner } from '@/components/now-playing-banner'
import { NowPlayingProvider } from '@/components/now-playing-context'
import { HourlyHeatmap } from '@/components/hourly-heatmap'
import { DayOfWeekChart } from '@/components/day-of-week-chart'
import { ListeningClock } from '@/components/listening-clock'
import { ListeningStreaks } from '@/components/listening-streaks'
import { ListeningSessions } from '@/components/listening-sessions'
import { Milestones } from '@/components/milestones'
import { NewDiscoveries } from '@/components/new-discoveries'
import { GenreBreakdown } from '@/components/genre-breakdown'
import { LovedTracksTimeline } from '@/components/loved-tracks-timeline'
import { ExportButton } from '@/components/export-button'
import { ListeningTimeEstimate } from '@/components/listening-time-estimate'
import { NightOwlStats } from '@/components/night-owl-stats'
import { WeeklyPattern } from '@/components/weekly-pattern'
import { ArtistLoyalty } from '@/components/artist-loyalty'
import { ScrobbleVelocity } from '@/components/scrobble-velocity'
import { RepeatPlays } from '@/components/repeat-plays'
import { ListeningGap } from '@/components/listening-gap'
import { Rediscovery } from '@/components/rediscovery'
import { SimilarUnheard } from '@/components/similar-unheard'
import { HiddenGems } from '@/components/hidden-gems'
import { NewReleases } from '@/components/new-releases'
import { ListeningTreemap } from '@/components/listening-treemap'
import { YoYChart } from '@/components/yoy-chart'
import { ScatterPlot } from '@/components/scatter-plot'
import { AlbumCompletion } from '@/components/album-completion'
import { MusicTimeline } from '@/components/music-timeline'
import { TasteBadge } from '@/components/taste-badge'
import { PrintButton } from '@/components/print-button'
import { CopyStatsButton } from '@/components/copy-stats-button'
import { CopyProfileUrl } from '@/components/copy-profile-url'
import { ShareProfileButton } from '@/components/share-profile-button'
import { LoyaltyScoreBadge } from '@/components/loyalty-score-badge'
import { MilestoneToast } from '@/components/milestone-toast'
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts'
import { KeyboardShortcutsModal } from '@/components/keyboard-shortcuts-modal'
import { TopStatsBanner } from '@/components/top-stats-banner'
import { SonicDna } from '@/components/sonic-dna'
import { ArtistConnections } from '@/components/artist-connections'
import { MusicEvolution } from '@/components/music-evolution'
import { ListeningChapters } from '@/components/listening-chapters'
import { ListeningForecast } from '@/components/listening-forecast'
import { ScrobbleIntegrity } from '@/components/scrobble-integrity'
import { TasteCompatibility } from '@/components/taste-compatibility'
import { GenreBreakdownDetail } from '@/components/genre-breakdown-detail'
import { SectionErrorBoundary } from '@/components/section-error-boundary'
import { CollapsibleSection } from '@/components/collapsible-section'
import { DashboardProvider, useDashboard } from '@/components/dashboard-provider'
import { DashboardWidget } from '@/components/dashboard-widget'
import { ListeningPersonality } from '@/components/listening-personality'
import { MonthlyTopTrack } from '@/components/monthly-top-track'
import { StreakCalendar } from '@/components/streak-calendar'
import { FirstListens } from '@/components/first-listens'
import { MoodRing } from '@/components/mood-ring'
import { ListeningBingo } from '@/components/listening-bingo'
import { YearlyTopAlbum } from '@/components/yearly-top-album'
import { MarathonSessions } from '@/components/marathon-sessions'
import { OnThisDay } from '@/components/on-this-day'
import { TagCloud } from '@/components/tag-cloud'
import { YouMightLike } from '@/components/you-might-like'
import { RecentArtistsCarousel } from '@/components/recent-artists-carousel'
import { DynamicTitle } from '@/components/dynamic-title'
import { LazyWidget } from '@/components/lazy-widget'
import { ListeningGapAlert } from '@/components/listening-gap-alert'
import { DecadeBreakdown } from '@/components/decade-breakdown'
import { SeasonListening } from '@/components/season-listening'
import { ComebackArtists } from '@/components/comeback-artists'
import { DiscoveryPace } from '@/components/discovery-pace'
import { DiversityScore } from '@/components/diversity-score'
import { PeakYear } from '@/components/peak-year'
import { MusicAge } from '@/components/music-age'
import { ArtistLongevity } from '@/components/artist-longevity'
import { OneHitWonders } from '@/components/one-hit-wonders'
import { AlbumOfMonth } from '@/components/album-of-month'
import { LiveStats } from '@/components/live-stats'
import { ChartRiseFall } from '@/components/chart-rise-fall'
import { NightVsDay } from '@/components/night-vs-day'
import { ListeningFriends } from '@/components/listening-friends'
import { ActivityFeed } from '@/components/activity-feed'
import { UnderratedTracks } from '@/components/underrated-tracks'
import { ScrobbleHeatmap } from '@/components/scrobble-heatmap'
import { TopCollaborations } from '@/components/top-collaborations'
import { ListeningReport } from '@/components/listening-report'
import { ArtistNetwork } from '@/components/artist-network'
import type { WidgetId, WidgetSize } from '@/lib/dashboard-widgets'
import type { Period } from '@/lib/lastfm'

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

  const { order, sizes, isEditing, setEditing, reset } = useDashboard()

  // Persist visited username so compare page can offer "Paste my username"
  useEffect(() => {
    try { localStorage.setItem('lastfmMe', username) } catch { /* ignore */ }
  }, [username])

  const topArtistsOverall = topArtists['overall'] ?? []
  const topTracksOverall = topTracks['overall'] ?? []

  const todayCount = (() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return allScrobbles.filter((s) => new Date(s.scrobbledAt) >= startOfToday).length
  })()

  // ─── Widget render map ──────────────────────────────────────────────────────
  function renderWidget(id: WidgetId, widgetSize: WidgetSize) {
    switch (id) {
      case 'stats-chart':
        return (
          <SectionErrorBoundary name="Stats Chart">
            <StatsChart username={username} scrobbles={allScrobbles} />
          </SectionErrorBoundary>
        )

      case 'stats-grid':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ListeningTimeEstimate totalScrobbles={totalScrobbles} />
            <NightOwlStats scrobbles={allScrobbles} />
            <WeeklyPattern scrobbles={allScrobbles} />
            <ArtistLoyalty topArtists={topArtistsOverall} totalScrobbles={totalScrobbles} />
          </div>
        )

      case 'velocity':
        return <ScrobbleVelocity scrobbles={allScrobbles} />

      case 'sonic-dna':
        return (
          <SectionErrorBoundary name="Sonic DNA">
            <SonicDna
              scrobbles={allScrobbles}
              topArtists={topArtistsOverall}
              topTracks={topTracksOverall}
              totalScrobbles={totalScrobbles}
            />
          </SectionErrorBoundary>
        )

      case 'artist-connections':
        return (
          <SectionErrorBoundary name="Artist Connections">
            <LazyWidget>
              <ArtistConnections scrobbles={allScrobbles} topArtists={topArtistsOverall} />
            </LazyWidget>
          </SectionErrorBoundary>
        )

      case 'time-patterns':
        return (
          <CollapsibleSection id="time-patterns" title="Time Patterns">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <HourlyHeatmap scrobbles={allScrobbles} />
              <DayOfWeekChart scrobbles={allScrobbles} />
              <ListeningClock scrobbles={allScrobbles} />
            </div>
          </CollapsibleSection>
        )

      case 'sessions-row':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ListeningStreaks scrobbles={allScrobbles} />
            <ListeningSessions scrobbles={allScrobbles} />
            <Milestones totalScrobbles={totalScrobbles} />
          </div>
        )

      case 'treemap':
        return (
          <SectionErrorBoundary name="Listening Universe">
            <LazyWidget>
              <ListeningTreemap topArtists={topArtistsOverall} />
            </LazyWidget>
          </SectionErrorBoundary>
        )

      case 'yoy-chart':
        return (
          <SectionErrorBoundary name="Year over Year">
            <YoYChart scrobbles={allScrobbles} />
          </SectionErrorBoundary>
        )

      case 'evolution':
        return (
          <SectionErrorBoundary name="Music Evolution">
            <LazyWidget>
              <MusicEvolution scrobbles={allScrobbles} />
            </LazyWidget>
          </SectionErrorBoundary>
        )

      case 'chapters':
        return (
          <LazyWidget>
            <ListeningChapters
              scrobbles={allScrobbles}
              totalScrobbles={totalScrobbles}
              registeredAt={registeredAt}
            />
          </LazyWidget>
        )

      case 'forecast':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ListeningForecast scrobbles={allScrobbles} />
            <ScrobbleIntegrity scrobbles={allScrobbles} />
          </div>
        )

      case 'scatter':
        return (
          <SectionErrorBoundary name="Scatter Plot">
            <ScatterPlot topArtists={topArtistsOverall} topTracks={topTracksOverall} />
          </SectionErrorBoundary>
        )

      case 'top-lists':
        return (
          <TopLists
            username={username}
            artists={topArtists[period]}
            albums={topAlbums[period]}
            tracks={topTracks[period]}
            period={period}
            onPeriodChange={setPeriod}
          />
        )

      case 'discovery':
        return (
          <CollapsibleSection id="discovery" title="Discovery & Recommendations">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <SimilarUnheard username={username} />
              <HiddenGems username={username} />
              <NewReleases username={username} />
              <Rediscovery username={username} />
            </div>
          </CollapsibleSection>
        )

      case 'taste-genre':
        return (
          <div className="grid gap-6">
            <SectionErrorBoundary name="Taste Compatibility">
              <TasteCompatibility username={username} />
            </SectionErrorBoundary>
            <GenreBreakdownDetail username={username} />
            <NewDiscoveries username={username} />
            <GenreBreakdown username={username} />
          </div>
        )

      case 'extra-stats':
        return (
          <div className="grid gap-6">
            <RepeatPlays username={username} />
            <ListeningGap scrobbles={allScrobbles} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MusicTimeline username={username} />
              <TasteBadge username={username} topArtists={topArtistsOverall} />
            </div>
            <AlbumCompletion username={username} />
          </div>
        )

      case 'recent':
        return (
          <div className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-6">
              <RecentTracks tracks={recentTracks} isOwner={isOwner} username={username} />
              <LovedTracks tracks={lovedTracks} />
            </div>
            <LovedTracksTimeline lovedTracks={lovedTracks} />
          </div>
        )

      case 'listening-personality':
        return (
          <ListeningPersonality
            topArtists={topArtistsOverall}
            totalScrobbles={totalScrobbles}
            scrobbles={allScrobbles}
          />
        )

      case 'monthly-top-track':
        return <MonthlyTopTrack scrobbles={allScrobbles} />

      case 'streak-calendar':
        return <StreakCalendar scrobbles={allScrobbles} />

      case 'first-listens':
        return (
          <FirstListens
            scrobbles={allScrobbles.map((s) => ({ ...s, album: null }))}
          />
        )

      case 'mood-ring':
        return <MoodRing scrobbles={allScrobbles} />

      case 'listening-bingo':
        return (
          <ListeningBingo
            scrobbles={allScrobbles}
            totalScrobbles={totalScrobbles}
          />
        )

      case 'yearly-top-album':
        return (
          <YearlyTopAlbum
            scrobbles={allScrobbles.map((s) => ({ ...s, album: null }))}
          />
        )

      case 'marathon-sessions':
        return <MarathonSessions scrobbles={allScrobbles} />

      case 'on-this-day':
        return <OnThisDay scrobbles={allScrobbles} />

      case 'tag-cloud':
        return <TagCloud username={username} />

      case 'you-might-like':
        return <YouMightLike username={username} />

      case 'recent-carousel':
        return <RecentArtistsCarousel scrobbles={allScrobbles} username={username} />

      case 'now-playing-banner':
        return <NowPlayingBanner />

      case 'decade-breakdown':
        return (
          <SectionErrorBoundary name="Genre Breakdown by Era">
            <DecadeBreakdown username={username} topArtists={topArtistsOverall} />
          </SectionErrorBoundary>
        )

      case 'season-listening':
        return <SeasonListening scrobbles={allScrobbles} layoutSize={widgetSize} />

      case 'comeback-artists':
        return <ComebackArtists scrobbles={allScrobbles} username={username} />

      case 'discovery-pace':
        return <DiscoveryPace scrobbles={allScrobbles} />

      case 'diversity-score':
        return (
          <DiversityScore
            topArtists={topArtistsOverall}
            totalScrobbles={totalScrobbles}
          />
        )

      case 'peak-year':
        return <PeakYear scrobbles={allScrobbles} />

      case 'music-age':
        return (
          <SectionErrorBoundary name="Music Age">
            <MusicAge username={username} topArtists={topArtistsOverall} />
          </SectionErrorBoundary>
        )

      case 'artist-longevity':
        return <ArtistLongevity scrobbles={allScrobbles} username={username} />

      case 'one-hit-wonders':
        return <OneHitWonders scrobbles={allScrobbles} username={username} />

      case 'album-of-month':
        return (
          <AlbumOfMonth
            scrobbles={allScrobbles.map((s) => ({ ...s, album: null }))}
            username={username}
          />
        )

      case 'live-stats':
        return <LiveStats scrobbles={allScrobbles} username={username} />

      case 'chart-rise-fall':
        return (
          <SectionErrorBoundary name="Chart Rise & Fall">
            <ChartRiseFall topArtists={topArtists} />
          </SectionErrorBoundary>
        )

      case 'night-vs-day':
        return <NightVsDay scrobbles={allScrobbles} />

      case 'listening-friends':
        return (
          <ListeningFriends
            username={username}
            topArtists={topArtistsOverall}
          />
        )

      case 'activity-feed':
        return (
          <ActivityFeed
            scrobbles={allScrobbles}
            totalScrobbles={totalScrobbles}
            registeredAt={registeredAt}
          />
        )

      case 'underrated-tracks':
        return (
          <SectionErrorBoundary name="Underrated Tracks">
            <UnderratedTracks username={username} topArtists={topArtistsOverall} />
          </SectionErrorBoundary>
        )

      case 'scrobble-heatmap':
        return <ScrobbleHeatmap scrobbles={allScrobbles} />

      case 'top-collaborations':
        return <TopCollaborations scrobbles={allScrobbles} />

      case 'listening-report':
        return <ListeningReport scrobbles={allScrobbles} />

      case 'artist-network':
        return (
          <SectionErrorBoundary name="Artist Network">
            <LazyWidget>
              <ArtistNetwork scrobbles={allScrobbles} topArtists={topArtistsOverall} />
            </LazyWidget>
          </SectionErrorBoundary>
        )

      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 pb-8 pt-2 max-w-[var(--content-max-width)]">
      {/* Invisible/overlay components */}
      <DynamicTitle username={username} todayCount={todayCount} />
      <MilestoneToast totalScrobbles={totalScrobbles} />
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

      {/* Main content + sidebar layout */}
      <div className="flex gap-6 mt-6 items-start">
        {/* Dashboard widgets in user-configured order */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-w-0 auto-rows-min grid-flow-row-dense">
          {order.map((id) => (
            <DashboardWidget key={id} id={id}>
              {renderWidget(id, sizes[id] ?? 2)}
            </DashboardWidget>
          ))}
        </div>

        {/* Profile stats sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block sticky top-4">
          <ProfileStatsSidebar
            registeredAt={registeredAt}
            totalScrobbles={totalScrobbles}
            profileStats={profileStats}
            allScrobbles={allScrobbles}
          />
        </aside>
      </div>
    </div>
  )
}

// ─── Outer component (provides context) ──────────────────────────────────────

export function UserProfile(props: UserProfileProps) {
  return (
    <NowPlayingProvider username={props.username}>
      <DashboardProvider
        isOwner={props.isOwner}
        initialOrder={props.initialDashboardOrder}
        initialHidden={props.initialDashboardHidden}
        initialSizes={props.initialDashboardSizes}
      >
        <UserProfileContent {...props} />
      </DashboardProvider>
    </NowPlayingProvider>
  )
}
