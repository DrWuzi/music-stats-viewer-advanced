export const WIDGET_DEFS = [
  { id: 'stats-chart',        label: 'Scrobble History' },
  { id: 'stats-grid',         label: 'Listening Stats' },
  { id: 'velocity',           label: 'Scrobble Velocity' },
  { id: 'sonic-dna',          label: 'Sonic DNA' },
  { id: 'artist-connections', label: 'Artist Connections' },
  { id: 'time-patterns',      label: 'Time Patterns' },
  { id: 'sessions-row',       label: 'Streaks & Sessions' },
  { id: 'treemap',            label: 'Listening Universe' },
  { id: 'yoy-chart',          label: 'Year over Year' },
  { id: 'evolution',          label: 'Music Evolution' },
  { id: 'chapters',           label: 'Listening Chapters' },
  { id: 'forecast',           label: 'Forecast & Data Health' },
  { id: 'scatter',            label: 'Track vs Artist' },
  { id: 'top-lists',          label: 'Top Charts' },
  { id: 'discovery',          label: 'Discovery' },
  { id: 'taste-genre',        label: 'Taste & Genre' },
  { id: 'extra-stats',        label: 'More Stats' },
  { id: 'recent',             label: 'Recent & Loved Tracks' },
] as const

export type WidgetId = (typeof WIDGET_DEFS)[number]['id']

export const WIDGET_LABELS: Record<WidgetId, string> = Object.fromEntries(
  WIDGET_DEFS.map((w) => [w.id, w.label]),
) as Record<WidgetId, string>

export const DEFAULT_ORDER: WidgetId[] = WIDGET_DEFS.map((w) => w.id)
