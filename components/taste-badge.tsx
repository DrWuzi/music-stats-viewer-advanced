'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Share2, Music2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { artistHref } from '@/lib/urls'

interface TasteBadgeProps {
  username: string
  topArtists: { name: string }[]
}

export function TasteBadge({ username, topArtists }: TasteBadgeProps) {
  const [copied, setCopied] = useState(false)

  const top3 = topArtists.slice(0, 3)

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="border rounded-xl p-5 flex flex-col gap-3 bg-card shadow-sm max-w-xs">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Share2 className="h-4 w-4" />
        Share profile
      </div>

      <div>
        <div className="text-lg font-bold">{username}</div>
        {top3.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {top3.map((artist, idx) => (
              <li key={artist.name} className="text-sm flex items-center gap-2">
                <span className="text-muted-foreground text-xs w-4">{idx + 1}.</span>
                <Link
                  href={artistHref(artist.name, username)}
                  className="font-medium hover:underline hover:text-primary transition-colors"
                >
                  {artist.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Music2} title="No top artists yet." size="compact" />
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={handleCopy}
        className="w-full"
      >
        {copied ? 'Copied!' : 'Copy link'}
      </Button>
    </div>
  )
}
