'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const SIZE_CLASSES = {
  xs: 'h-5 w-5',
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-20 w-20',
  xl: 'h-32 w-32',
}

interface ArtistImageProps {
  name: string
  size?: keyof typeof SIZE_CLASSES
  className?: string
}

export function ArtistImage({ name, size = 'md', className }: ArtistImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/artist-image?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled && data.url) setImageUrl(data.url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [name])

  return (
    <Avatar className={`${SIZE_CLASSES[size]} shrink-0 ${className ?? ''}`}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
      <AvatarFallback className="text-xs font-semibold">
        {name[0]?.toUpperCase() ?? '?'}
      </AvatarFallback>
    </Avatar>
  )
}
