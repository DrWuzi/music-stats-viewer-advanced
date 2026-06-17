import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Track {
  artist: string
  album: string | null
  track: string
  scrobbledAt: Date
}

function fmt(date: Date): string {
  const today = new Date()
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (date.toDateString() === today.toDateString()) return `Today ${time}`
  const yest = new Date(today)
  yest.setDate(today.getDate() - 1)
  if (date.toDateString() === yest.toDateString()) return `Yesterday ${time}`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${time}`
}

export function RecentTracks({ tracks }: { tracks: Track[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tracks</CardTitle>
      </CardHeader>
      <CardContent>
        {tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tracks scrobbled yet.</p>
        ) : (
          <ul className="divide-y">
            {tracks.map((t, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{t.track}</span>
                  <span className="text-sm text-muted-foreground truncate">
                    {t.artist}{t.album ? ` — ${t.album}` : ''}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground ml-4 shrink-0">{fmt(t.scrobbledAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
