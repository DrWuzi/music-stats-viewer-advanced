import { RecentTracks } from '@/components/recent-tracks'
import { TopLists } from '@/components/top-lists'
import { LovedTracks } from '@/components/loved-tracks'
import { StatsChart } from '@/components/stats-chart'
import { NowPlayingBanner } from '@/components/now-playing-banner'
import { HourlyHeatmap } from '@/components/hourly-heatmap'
import { DayOfWeekChart } from '@/components/day-of-week-chart'
import { ListeningClock } from '@/components/listening-clock'
import { ListeningStreaks } from '@/components/listening-streaks'
import { ListeningSessions } from '@/components/listening-sessions'
import { Milestones } from '@/components/milestones'
import { NewDiscoveries } from '@/components/new-discoveries'
import { GenreBreakdown } from '@/components/genre-breakdown'
import { LovedTracksTimeline } from '@/components/loved-tracks-timeline'
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
import { LazyWidget } from '@/components/lazy-widget'
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

export interface ProfileWidgetData {
  username: string
  totalScrobbles: number
  registeredAt: Date
  isOwner: boolean
  recentTracks: { artist: string; album: string | null; track: string; scrobbledAt: Date }[]
  topArtists: Record<Period, { name: string; playcount: number; rank: number }[]>
  topAlbums: Record<Period, { name: string; artist: string; playcount: number; rank: number }[]>
  topTracks: Record<Period, { name: string; artist: string; playcount: number; rank: number }[]>
  lovedTracks: { artist: string; track: string; lovedAt: Date }[]
  allScrobbles: { scrobbledAt: Date; artist: string; track: string }[]
  period: Period
  onPeriodChange: (p: Period) => void
}

export function renderProfileWidget(id: WidgetId, widgetSize: WidgetSize, data: ProfileWidgetData) {
  const {
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
    onPeriodChange,
  } = data
  const topArtistsOverall = topArtists['overall'] ?? []
  const topTracksOverall = topTracks['overall'] ?? []

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
          <ArtistLoyalty topArtists={topArtistsOverall} totalScrobbles={totalScrobbles} username={username} />
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
            username={username}
          />
        </LazyWidget>
      )

    case 'forecast':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ListeningForecast scrobbles={allScrobbles} />
          <ScrobbleIntegrity scrobbles={allScrobbles} username={username} />
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
          onPeriodChange={onPeriodChange}
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
            <LovedTracks tracks={lovedTracks} username={username} />
          </div>
          <LovedTracksTimeline lovedTracks={lovedTracks} username={username} />
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
      return <MonthlyTopTrack scrobbles={allScrobbles} username={username} />

    case 'streak-calendar':
      return <StreakCalendar scrobbles={allScrobbles} username={username} />

    case 'first-listens':
      return (
        <FirstListens
          scrobbles={allScrobbles.map((s) => ({ ...s, album: null }))}
          username={username}
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
          username={username}
        />
      )

    case 'marathon-sessions':
      return <MarathonSessions scrobbles={allScrobbles} username={username} />

    case 'on-this-day':
      return <OnThisDay scrobbles={allScrobbles} username={username} />

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
      return (
        <LazyWidget>
          <ComebackArtists scrobbles={allScrobbles} username={username} />
        </LazyWidget>
      )

    case 'discovery-pace':
      return (
        <LazyWidget>
          <DiscoveryPace scrobbles={allScrobbles} />
        </LazyWidget>
      )

    case 'diversity-score':
      return (
        <DiversityScore
          topArtists={topArtistsOverall}
          totalScrobbles={totalScrobbles}
          username={username}
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
      return <LiveStats scrobbles={allScrobbles} />

    case 'chart-rise-fall':
      return (
        <SectionErrorBoundary name="Chart Rise & Fall">
          <ChartRiseFall topArtists={topArtists} username={username} />
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
        <LazyWidget>
          <ActivityFeed
            scrobbles={allScrobbles}
            totalScrobbles={totalScrobbles}
            registeredAt={registeredAt}
            username={username}
          />
        </LazyWidget>
      )

    case 'underrated-tracks':
      return (
        <SectionErrorBoundary name="Underrated Tracks">
          <UnderratedTracks username={username} topArtists={topArtistsOverall} />
        </SectionErrorBoundary>
      )

    case 'scrobble-heatmap':
      return (
        <LazyWidget>
          <ScrobbleHeatmap scrobbles={allScrobbles} />
        </LazyWidget>
      )

    case 'top-collaborations':
      return (
        <LazyWidget>
          <TopCollaborations scrobbles={allScrobbles} username={username} />
        </LazyWidget>
      )

    case 'listening-report':
      return (
        <LazyWidget>
          <ListeningReport scrobbles={allScrobbles} username={username} />
        </LazyWidget>
      )

    case 'artist-network':
      return (
        <SectionErrorBoundary name="Artist Network">
          <LazyWidget>
            <ArtistNetwork scrobbles={allScrobbles} topArtists={topArtistsOverall} username={username} />
          </LazyWidget>
        </SectionErrorBoundary>
      )

    default:
      return null
  }
}
