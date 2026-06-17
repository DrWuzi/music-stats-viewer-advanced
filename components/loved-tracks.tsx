import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LovedTrack {
  artist: string
  track: string
  lovedAt: Date
}

export function LovedTracks({ tracks }: { tracks: LovedTrack[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loved Tracks</CardTitle>
      </CardHeader>
      <CardContent>
        {tracks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No loved tracks yet.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tracks.map((t, i) => (
              <li key={i} className="flex flex-col rounded-md border p-3">
                <span className="font-medium truncate">{t.track}</span>
                <span className="text-sm text-muted-foreground truncate">{t.artist}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
