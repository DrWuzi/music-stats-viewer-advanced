'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CopyStatsButtonProps {
  username: string
  totalScrobbles: number
  topArtist?: string
}

export function CopyStatsButton({ username, totalScrobbles, topArtist }: CopyStatsButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleClick = () => {
    let text = `${username} has ${totalScrobbles} scrobbles on Last.fm`
    if (topArtist) {
      text += ` | Top Artist: ${topArtist}`
    }
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      <Copy className="mr-2 h-4 w-4" />
      {copied ? 'Copied!' : 'Copy Stats'}
    </Button>
  )
}
