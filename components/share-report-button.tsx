'use client'

import { Button } from '@/components/ui/button'
import { Share2 } from 'lucide-react'

interface ShareReportButtonProps {
  username: string
  weekScrobbles: number
  topArtist: string | null
}

export function ShareReportButton({ username, weekScrobbles, topArtist }: ShareReportButtonProps) {
  function handleShare() {
    const text = [
      `${username}'s weekly Last.fm report`,
      `${weekScrobbles.toLocaleString('en-US')} scrobbles this week`,
      topArtist ? `Top artist: ${topArtist}` : null,
      `https://last.fm/user/${username}`,
    ]
      .filter(Boolean)
      .join('\n')

    navigator.clipboard.writeText(text).catch(() => {
      // Fallback: do nothing silently
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      <Share2 className="h-4 w-4 mr-1.5" />
      Share Report
    </Button>
  )
}
