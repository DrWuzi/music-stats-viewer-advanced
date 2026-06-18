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

// Module-level cache to avoid re-fetching the same artist in the same session
const imageCache = new Map<string, string | null>()

async function fetchArtistImage(name: string): Promise<string | null> {
  const res = await fetch(`/api/artist-image?name=${encodeURIComponent(name)}`)
  const data = await res.json()
  return data.url ?? null
}

interface ArtistImageProps {
  name: string
  size?: keyof typeof SIZE_CLASSES
  className?: string
}

export function ArtistImage({ name, size = 'md', className }: ArtistImageProps) {
  const cached = imageCache.get(name)
  const [imageUrl, setImageUrl] = useState<string | null>(cached !== undefined ? cached : null)
  const [loading, setLoading] = useState(cached === undefined)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (imageCache.has(name)) {
      setImageUrl(imageCache.get(name) ?? null)
      setLoading(false)
      return
    }

    let cancelled = false

    const attempt = (isRetry: boolean) => {
      fetchArtistImage(name)
        .then((url) => {
          if (cancelled) return
          imageCache.set(name, url)
          setImageUrl(url)
          setLoading(false)
        })
        .catch(() => {
          if (cancelled) return
          if (!isRetry) {
            setTimeout(() => {
              if (!cancelled) attempt(true)
            }, 2000)
          } else {
            imageCache.set(name, null)
            setLoading(false)
          }
        })
    }

    attempt(false)

    return () => {
      cancelled = true
    }
  }, [name])

  const sizeClass = SIZE_CLASSES[size]

  if (loading) {
    return (
      <div
        className={`animate-shimmer rounded-full shrink-0 ${sizeClass} ${className ?? ''}`}
        aria-label={`Loading image for ${name}`}
      />
    )
  }

  return (
    <Avatar className={`${sizeClass} shrink-0 ${className ?? ''}`}>
      {imageUrl && (
        <AvatarImage
          src={imageUrl}
          alt={name}
          className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
      )}
      <AvatarFallback className="text-xs font-semibold">
        {name[0]?.toUpperCase() ?? '?'}
      </AvatarFallback>
    </Avatar>
  )
}
