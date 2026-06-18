'use client'

import Link from 'next/link'
import { ArtistImage } from '@/components/artist-image'

interface ArtistHoverCardProps {
  name: string
  playcount?: number
  username?: string
  children: React.ReactNode
}

export function ArtistHoverCard({ name, playcount, username, children }: ArtistHoverCardProps) {
  const artistUrl = username
    ? `/user/${username}/artist/${encodeURIComponent(name)}`
    : `/artist/${encodeURIComponent(name)}`

  const titleParts: string[] = [name]
  if (playcount !== undefined) {
    titleParts.push(`${playcount.toLocaleString()} plays`)
  }

  return (
    <Link href={artistUrl} title={titleParts.join(' — ')} className="hover:underline">
      {children}
    </Link>
  )
}
