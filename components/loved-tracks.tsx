import { Heart } from 'lucide-react'
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
          <div className="flex flex-col items-center gap-2 p-8 text-muted-foreground">
            <Heart className="h-8 w-8 opacity-40" />
            <p className="text-sm">No loved tracks yet.</p>
            <p className="text-xs opacity-70">Heart a track on Last.fm and it will show up here.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tracks.map((t) => (
              <li key={`${t.artist}::${t.track}`} className="flex flex-col rounded-md border p-3">
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
