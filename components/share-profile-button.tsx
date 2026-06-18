'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShareProfileButtonProps {
  username: string
  scrobbles?: number
  topArtist?: string
}

export function ShareProfileButton({ username, scrobbles, topArtist }: ShareProfileButtonProps) {
  const [shared, setShared] = useState(false)

  const handleClick = async () => {
    const profileUrl = window.location.href
    const cardParams = new URLSearchParams({ username })
    if (scrobbles !== undefined) cardParams.set('scrobbles', String(scrobbles))
    if (topArtist) cardParams.set('artist', topArtist)
    const ogImage = `${window.location.origin}/api/share-card?${cardParams.toString()}`

    if (navigator.share) {
      await navigator.share({
        title: `${username} on Last.fm Advanced`,
        text: `Check out ${username}'s listening stats — ${scrobbles?.toLocaleString() ?? ''} scrobbles${topArtist ? `, top artist: ${topArtist}` : ''}`,
        url: profileUrl,
      })
    } else {
      await navigator.clipboard.writeText(`${profileUrl}\n${ogImage}`)
    }
    setShared(true)
    setTimeout(() => setShared(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <Share2 className="mr-2 h-4 w-4" />
      {shared ? 'Shared!' : 'Share'}
    </Button>
  )
}
