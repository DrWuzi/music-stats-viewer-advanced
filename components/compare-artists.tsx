'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { artistHref } from '@/lib/urls'

interface ArtistEntry {
  name: string
}

interface CompareArtistsProps {
  topShared: ArtistEntry[]
  uniqueToUser1: ArtistEntry[]
  uniqueToUser2: ArtistEntry[]
  user1: string
  user2: string
}

export function CompareArtists({
  topShared,
  uniqueToUser1,
  uniqueToUser2,
  user1,
  user2,
}: CompareArtistsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Only user1 */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-center truncate">Only {user1}</p>
        <div className="flex flex-col gap-1.5">
          {uniqueToUser1.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center">None</p>
          ) : (
            uniqueToUser1.map((a) => (
              <Badge key={a.name} variant="outline" className="truncate justify-center text-xs">
                <Link href={artistHref(a.name, user1)} className="hover:underline">
                  {a.name}
                </Link>
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* Both love */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-center">Both Love</p>
        <div className="flex flex-col gap-1.5">
          {topShared.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center">None</p>
          ) : (
            topShared.map((a) => (
              <Badge key={a.name} variant="default" className="truncate justify-center text-xs">
                <Link href={artistHref(a.name, user1)} className="hover:underline">
                  {a.name}
                </Link>
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* Only user2 */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-center truncate">Only {user2}</p>
        <div className="flex flex-col gap-1.5">
          {uniqueToUser2.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center">None</p>
          ) : (
            uniqueToUser2.map((a) => (
              <Badge key={a.name} variant="outline" className="truncate justify-center text-xs">
                <Link href={artistHref(a.name, user1)} className="hover:underline">
                  {a.name}
                </Link>
              </Badge>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
