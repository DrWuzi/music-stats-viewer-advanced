'use client'

import { useState } from 'react'
import { LayoutDashboard, RotateCcw, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SyncStatus } from '@/components/sync-status'
import { RecentTracks } from '@/components/recent-tracks'
import { TopLists } from '@/components/top-lists'
import { LovedTracks } from '@/components/loved-tracks'
import { StatsChart } from '@/components/stats-chart'
import { NowPlaying } from '@/components/now-playing'
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
import { LastActivityNudge } from '@/components/last-activity-nudge'
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
import { ResyncButton } from '@/components/resync-button'
import { CopyStatsButton } from '@/components/copy-stats-button'
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
import type { WidgetId } from '@/lib/dashboard-widgets'
import type { Period } from '@/lib/lastfm'

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
}

// ─── Inner component (uses context) ──────────────────────────────────────────

function UserProfileContent({
  username,
  totalScrobbles,
  registeredAt,
  imageUrl,
  lastSyncedAt,
  isOwner,
  recentTracks,
  topArtists,
  topAlbums,
  topTracks,
  lovedTracks,
  allScrobbles,
}: UserProfileProps) {
  const [period, setPeriod] = useState<Period>('7day')
  const { order, isEditing, setEditing, reset } = useDashboard()

  const topArtistsOverall = topArtists['overall'] ?? []
  const topTracksOverall = topTracks['overall'] ?? []

  // ─── Widget render map ──────────────────────────────────────────────────────
  function renderWidget(id: WidgetId) {
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
            <ArtistConnections scrobbles={allScrobbles} topArtists={topArtistsOverall} />
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
            <ListeningTreemap topArtists={topArtistsOverall} />
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
            <MusicEvolution scrobbles={allScrobbles} />
          </SectionErrorBoundary>
        )

      case 'chapters':
        return (
          <ListeningChapters
            scrobbles={allScrobbles}
            totalScrobbles={totalScrobbles}
            registeredAt={registeredAt}
          />
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

      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Invisible/overlay components */}
      <MilestoneToast totalScrobbles={totalScrobbles} />
      <KeyboardShortcuts isOwner={isOwner} />
      <KeyboardShortcutsModal />

      <NowPlaying username={username} />

      {/* Profile header */}
      <div className="animate-fade-in bg-gradient-to-br from-primary/5 to-transparent rounded-2xl p-6 flex items-center gap-4 mb-6 mt-4">
        <Avatar className="h-20 w-20 ring-2 ring-primary/20 ring-offset-2">
          <AvatarImage src={imageUrl} alt={username} />
          <AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">{username}</h1>
          <p className="text-muted-foreground text-sm">
            {totalScrobbles.toLocaleString('en-US')} scrobbles · Member since{' '}
            {new Date(registeredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </p>
          <LoyaltyScoreBadge topArtists={topArtistsOverall} totalScrobbles={totalScrobbles} />
          <LastActivityNudge lastSyncedAt={lastSyncedAt} />
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isOwner && <ResyncButton username={username} />}
          <CopyStatsButton
            username={username}
            totalScrobbles={totalScrobbles}
            topArtist={topArtistsOverall[0]?.name}
          />
          <ShareProfileButton username={username} />
          {isOwner && <ExportButton username={username} />}
          <SyncStatus lastSyncedAt={lastSyncedAt} isOwner={isOwner} />

          {/* Edit layout toggle */}
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={reset}
                title="Reset to default layout"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
              <Button size="sm" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5 mr-1" />
                Done
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <LayoutDashboard className="h-3.5 w-3.5 mr-1" />
              Edit Layout
            </Button>
          )}
        </div>
      </div>

      {/* Edit mode hint banner */}
      {isEditing && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-muted-foreground">
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

      {/* Dashboard widgets in user-configured order */}
      <div className="grid gap-6 mt-6">
        {order.map((id) => (
          <DashboardWidget key={id} id={id}>
            {renderWidget(id)}
          </DashboardWidget>
        ))}
      </div>
    </div>
  )
}

// ─── Outer component (provides context) ──────────────────────────────────────

export function UserProfile(props: UserProfileProps) {
  return (
    <DashboardProvider>
      <UserProfileContent {...props} />
    </DashboardProvider>
  )
}
