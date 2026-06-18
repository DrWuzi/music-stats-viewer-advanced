'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShareProfileButtonProps {
  username: string
  scrobbles?: number
  topArtist?: string
  topTrack?: string
  totalArtists?: number
  period?: string
}

export function ShareProfileButton({
  username,
  scrobbles,
  topArtist,
  topTrack,
  totalArtists,
  period,
}: ShareProfileButtonProps) {
  const [shared, setShared] = useState(false)

  const handleClick = async () => {
    const profileUrl = window.location.href
    const cardParams = new URLSearchParams({ username })
    if (scrobbles !== undefined) cardParams.set('scrobbles', String(scrobbles))
    if (topArtist) cardParams.set('artist', topArtist)
    if (topTrack) cardParams.set('tracks', topTrack)
    if (totalArtists !== undefined) cardParams.set('artists', String(totalArtists))
    if (period) cardParams.set('period', period)
    const ogImage = `${window.location.origin}/api/share-card?${cardParams.toString()}`

    const shareText = [
      `Check out ${username}'s listening stats on Last.fm Advanced`,
      scrobbles !== undefined ? `${scrobbles.toLocaleString()} scrobbles` : null,
      topArtist ? `top artist: ${topArtist}` : null,
      topTrack ? `top track: ${topTrack}` : null,
    ]
      .filter(Boolean)
      .join(' · ')

    if (navigator.share) {
      await navigator.share({
        title: `${username} on Last.fm Advanced`,
        text: shareText,
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
