export const WIDGET_DEFS = [
  { id: 'stats-chart',           label: 'Scrobble History' },
  { id: 'stats-grid',            label: 'Listening Stats' },
  { id: 'velocity',              label: 'Scrobble Velocity' },
  { id: 'sonic-dna',             label: 'Sonic DNA' },
  { id: 'artist-connections',    label: 'Artist Connections' },
  { id: 'time-patterns',         label: 'Time Patterns' },
  { id: 'sessions-row',          label: 'Streaks & Sessions' },
  { id: 'treemap',               label: 'Listening Universe' },
  { id: 'yoy-chart',             label: 'Year over Year' },
  { id: 'evolution',             label: 'Music Evolution' },
  { id: 'chapters',              label: 'Listening Chapters' },
  { id: 'forecast',              label: 'Forecast & Data Health' },
  { id: 'scatter',               label: 'Track vs Artist' },
  { id: 'top-lists',             label: 'Top Charts' },
  { id: 'discovery',             label: 'Discovery' },
  { id: 'taste-genre',           label: 'Taste & Genre' },
  { id: 'extra-stats',           label: 'More Stats' },
  { id: 'recent',                label: 'Recent & Loved Tracks' },
  { id: 'listening-personality', label: 'Listening Personality' },
  { id: 'monthly-top-track',     label: 'Top Track of Every Month' },
  { id: 'streak-calendar',       label: 'Streak Calendar' },
  { id: 'first-listens',         label: 'First Listens' },
  { id: 'mood-ring',             label: 'Mood Ring' },
  { id: 'listening-bingo',       label: 'Listening Bingo' },
  { id: 'yearly-top-album',      label: 'Top Album Each Year' },
  { id: 'marathon-sessions',     label: 'Longest Listening Sessions' },
  { id: 'on-this-day',           label: 'On This Day' },
  { id: 'tag-cloud',             label: 'Tag Cloud' },
  { id: 'you-might-like',        label: 'Recommendations' },
  { id: 'recent-carousel',       label: 'Recent Artists' },
  { id: 'now-playing-banner',    label: 'Now Playing' },
  { id: 'decade-breakdown',      label: 'Genre Breakdown by Era' },
  { id: 'season-listening',      label: 'Season Listening' },
  { id: 'comeback-artists',      label: 'Comeback Artists' },
  { id: 'discovery-pace',        label: 'Discovery Pace' },
  { id: 'diversity-score',       label: 'Diversity Score' },
  { id: 'peak-year',             label: 'Peak Year' },
  { id: 'music-age',             label: 'Music Age' },
  { id: 'artist-longevity',      label: 'Artist Longevity' },
  { id: 'one-hit-wonders',       label: 'One Hit Wonders' },
  { id: 'album-of-month',        label: 'Album of the Month' },
  { id: 'live-stats',            label: 'Live Stats' },
  { id: 'chart-rise-fall',       label: 'Chart Rise & Fall' },
  { id: 'night-vs-day',          label: 'Night vs Day' },
  { id: 'listening-friends',     label: 'Find Music Twins' },
  { id: 'activity-feed',         label: 'Activity Feed' },
  { id: 'underrated-tracks',     label: 'Underrated Tracks' },
  { id: 'scrobble-heatmap',      label: 'Full Year Heatmap' },
  { id: 'top-collaborations',    label: 'Top Collaborations' },
  { id: 'listening-report',      label: 'Listening Report' },
  { id: 'artist-network',        label: 'Artist Network' },
] as const

export type WidgetId = (typeof WIDGET_DEFS)[number]['id']
export type WidgetSize = 1 | 2

export const DEFAULT_OVERVIEW_WIDGETS: WidgetId[] = [
  'stats-chart',
  'stats-grid',
  'top-lists',
  'recent',
  'season-listening',
  'listening-personality',
]

export const DEFAULT_OVERVIEW_HIDDEN: WidgetId[] = WIDGET_DEFS
  .map((widget) => widget.id)
  .filter((id) => !DEFAULT_OVERVIEW_WIDGETS.includes(id))

export const DEFAULT_WIDGET_SIZE_OVERRIDES: Partial<Record<WidgetId, WidgetSize>> = {
  'stats-chart': 2,
  'stats-grid': 1,
  'top-lists': 2,
  'recent': 2,
  'season-listening': 1,
  'listening-personality': 1,
}

export const WIDGET_LABELS: Record<WidgetId, string> = Object.fromEntries(
  WIDGET_DEFS.map((w) => [w.id, w.label]),
) as Record<WidgetId, string>

export const DEFAULT_ORDER: WidgetId[] = WIDGET_DEFS.map((w) => w.id)

export const DEFAULT_WIDGET_SIZE: WidgetSize = 2

export function createDefaultHidden() {
  return new Set<WidgetId>(DEFAULT_OVERVIEW_HIDDEN)
}

export function createDefaultSizes(overrides?: Partial<Record<WidgetId, WidgetSize>>) {
  return Object.fromEntries(
    WIDGET_DEFS.map((widget) => [
      widget.id,
      overrides?.[widget.id] ?? DEFAULT_WIDGET_SIZE_OVERRIDES[widget.id] ?? DEFAULT_WIDGET_SIZE,
    ]),
  ) as Record<WidgetId, WidgetSize>
}

// ─── Overview sections ────────────────────────────────────────────────────────
// Splits the single flat widget grid into thematic sections. Category is a
// static property of the widget id (assigned below), independent of the
// user's customizable `order` — dragging/hiding/resizing still works exactly
// as before, it just reorders/hides within a widget's own section rather than
// moving it into a different one.

export type WidgetCategory = 'overview' | 'trends' | 'taste' | 'sessions' | 'highlights' | 'social'

export const CATEGORY_ORDER: WidgetCategory[] = ['overview', 'trends', 'taste', 'sessions', 'highlights', 'social']

export const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  overview: 'At a Glance',
  trends: 'Trends & History',
  taste: 'Taste & Discovery',
  sessions: 'Sessions & Mood',
  highlights: 'Highlights & Memories',
  social: 'Social',
}

export const WIDGET_CATEGORIES: Record<WidgetId, WidgetCategory> = {
  'stats-chart': 'overview',
  'stats-grid': 'overview',
  'top-lists': 'overview',
  recent: 'overview',
  'extra-stats': 'overview',
  'now-playing-banner': 'overview',
  'live-stats': 'overview',

  velocity: 'trends',
  'time-patterns': 'trends',
  'yoy-chart': 'trends',
  evolution: 'trends',
  chapters: 'trends',
  forecast: 'trends',
  'streak-calendar': 'trends',
  'decade-breakdown': 'trends',
  'season-listening': 'trends',
  'peak-year': 'trends',
  'music-age': 'trends',
  'chart-rise-fall': 'trends',
  'night-vs-day': 'trends',
  'scrobble-heatmap': 'trends',

  'sonic-dna': 'taste',
  'artist-connections': 'taste',
  treemap: 'taste',
  scatter: 'taste',
  discovery: 'taste',
  'taste-genre': 'taste',
  'tag-cloud': 'taste',
  'recent-carousel': 'taste',
  'comeback-artists': 'taste',
  'discovery-pace': 'taste',
  'artist-longevity': 'taste',
  'one-hit-wonders': 'taste',
  'artist-network': 'taste',

  'sessions-row': 'sessions',
  'listening-personality': 'sessions',
  'mood-ring': 'sessions',
  'listening-bingo': 'sessions',
  'marathon-sessions': 'sessions',
  'diversity-score': 'sessions',

  'monthly-top-track': 'highlights',
  'first-listens': 'highlights',
  'yearly-top-album': 'highlights',
  'on-this-day': 'highlights',
  'you-might-like': 'highlights',
  'album-of-month': 'highlights',
  'underrated-tracks': 'highlights',
  'listening-report': 'highlights',

  'listening-friends': 'social',
  'activity-feed': 'social',
  'top-collaborations': 'social',
}
