import Link from 'next/link'
import { Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { artistHref, trackHref } from '@/lib/urls'

interface LovedTrack {
  artist: string
  track: string
  lovedAt: Date
}

export function LovedTracks({ tracks, username }: { tracks: LovedTrack[]; username: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loved Tracks</CardTitle>
      </CardHeader>
      <CardContent>
        {tracks.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No loved tracks yet."
            description="Heart a track on Last.fm and it will show up here."
            size="compact"
          />
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tracks.map((t) => (
              <li key={`${t.artist}::${t.track}`} className="flex flex-col rounded-md border p-3">
                <Link href={trackHref(t.artist, t.track, username)} className="font-medium truncate hover:underline text-foreground">
                  {t.track}
                </Link>
                <Link href={artistHref(t.artist, username)} className="text-sm text-muted-foreground truncate hover:underline hover:text-foreground transition-colors">
                  {t.artist}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
