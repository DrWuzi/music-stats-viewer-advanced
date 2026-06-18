'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CopyProfileUrl() {
  const [copied, setCopied] = useState(false)

  const handleClick = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} title="Copy profile link">
      <Link2 className="mr-2 h-4 w-4" />
      {copied ? 'Copied!' : 'Copy Link'}
    </Button>
  )
}
