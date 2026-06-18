'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShareProfileButtonProps {
  username: string
}

export function ShareProfileButton({ username }: ShareProfileButtonProps) {
  const [shared, setShared] = useState(false)

  const handleClick = async () => {
    if (navigator.share) {
      await navigator.share({ title: `${username} on Last.fm`, url: window.location.href })
    } else {
      await navigator.clipboard.writeText(window.location.href)
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
