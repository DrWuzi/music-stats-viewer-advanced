'use client'

import { cn } from '@/lib/utils'

export interface ListenOnProps {
  type: 'artist' | 'album' | 'track'
  artist: string
  album?: string
  track?: string
  variant?: 'full' | 'compact' | 'icons'
  className?: string
}

interface Service {
  name: string
  color: string
  textColor: string
  buildUrl: (query: string) => string
  logo: React.ReactNode
}

function buildQuery(type: ListenOnProps['type'], artist: string, album?: string, track?: string): string {
  if (type === 'track' && track) return encodeURIComponent(`${track} ${artist}`)
  if (type === 'album' && album) return encodeURIComponent(`${artist} ${album}`)
  return encodeURIComponent(artist)
}

function SpotifyLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#1DB954" />
      <path d="M17.25 16.5c-.2 0-.38-.06-.53-.18-2.03-1.26-4.59-1.54-7.61-.85-.28.07-.57-.1-.64-.39-.07-.28.1-.57.39-.64 3.32-.76 6.16-.44 8.44.97.26.16.34.5.18.76-.1.17-.28.33-.23.33z" fill="white" />
      <path d="M18.33 13.67c-.24 0-.45-.08-.62-.22-2.36-1.45-5.96-1.87-8.75-1.02-.32.1-.66-.09-.76-.41-.1-.32.09-.66.41-.76 3.18-.96 7.14-.5 9.82 1.17.3.18.4.57.22.87-.12.2-.33.37-.32.37z" fill="white" />
      <path d="M19.46 10.67c-.27 0-.52-.08-.73-.25-2.69-1.6-7.14-2.07-10.19-1.13-.37.11-.77-.09-.88-.47-.11-.37.09-.77.47-.88 3.46-1.05 8.39-.53 11.47 1.28.34.2.45.65.25.99-.13.24-.37.46-.39.46z" fill="white" />
    </svg>
  )
}

function YouTubeLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#FF0000" />
      <path d="M19.8 8.2c-.23-.87-.91-1.55-1.78-1.78C16.57 6 12 6 12 6s-4.57 0-6.02.42C5.11 6.65 4.43 7.33 4.2 8.2 3.78 9.65 3.78 12 3.78 12s0 2.35.42 3.8c.23.87.91 1.55 1.78 1.78C7.43 18 12 18 12 18s4.57 0 6.02-.42c.87-.23 1.55-.91 1.78-1.78.42-1.45.42-3.8.42-3.8s0-2.35-.42-3.8z" fill="white" />
      <polygon points="10,9.5 10,14.5 15,12" fill="#FF0000" />
    </svg>
  )
}

function AppleMusicLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="url(#am-g)" />
      <defs>
        <linearGradient id="am-g" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fc5c7d" />
          <stop offset="100%" stopColor="#6a3093" />
        </linearGradient>
      </defs>
      <path d="M17 8.5v5.67c0 .46-.15.87-.45 1.22-.3.35-.69.53-1.16.53-.47 0-.86-.18-1.16-.53a1.72 1.72 0 01-.45-1.22c0-.47.15-.87.45-1.22.3-.35.69-.52 1.16-.52.3 0 .57.07.8.21V9.78l-5 1.5v4.39c0 .46-.15.87-.45 1.22-.3.35-.69.53-1.16.53-.47 0-.86-.18-1.16-.53A1.72 1.72 0 018 15.67c0-.47.15-.87.45-1.22.3-.35.69-.52 1.16-.52.3 0 .57.07.8.21V9l7-2z" fill="white" />
    </svg>
  )
}

function DeezerLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#A238FF" />
      <text x="4" y="16" fontFamily="Arial" fontWeight="bold" fontSize="9" fill="white">DZ</text>
    </svg>
  )
}

function TidalLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#1A1A1A" />
      <path d="M12 8L8.5 11.5L12 15L15.5 11.5L12 8z" fill="white" />
      <path d="M8.5 11.5L5 15L8.5 18.5L12 15L8.5 11.5z" fill="white" opacity="0.6" />
      <path d="M15.5 11.5L12 15L15.5 18.5L19 15L15.5 11.5z" fill="white" opacity="0.6" />
    </svg>
  )
}

function SoundCloudLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#ff5500" />
      <path d="M4 14.5c0 1.1.9 2 2 2h11c1.65 0 3-1.35 3-3 0-1.55-1.18-2.82-2.7-2.97-.04-.03-.08-.05-.12-.06a4 4 0 00-3.93-3.42c-.18 0-.35.01-.52.04C12.07 6.36 11.08 6 10 6c-2.21 0-4 1.79-4 4 0 .11.01.22.02.33C4.88 10.85 4 12.55 4 14.5z" fill="white" />
    </svg>
  )
}

const SERVICES: Service[] = [
  { name: 'Spotify',     color: '#1DB954', textColor: '#fff', buildUrl: (q) => `https://open.spotify.com/search/${q}`,             logo: <SpotifyLogo /> },
  { name: 'YouTube',     color: '#FF0000', textColor: '#fff', buildUrl: (q) => `https://www.youtube.com/results?search_query=${q}`, logo: <YouTubeLogo /> },
  { name: 'Apple Music', color: '#fc5c7d', textColor: '#fff', buildUrl: (q) => `https://music.apple.com/search?term=${q}`,          logo: <AppleMusicLogo /> },
  { name: 'Deezer',      color: '#A238FF', textColor: '#fff', buildUrl: (q) => `https://www.deezer.com/search/${q}`,                logo: <DeezerLogo /> },
  { name: 'Tidal',       color: '#1A1A1A', textColor: '#fff', buildUrl: (q) => `https://tidal.com/browse/search/${q}`,              logo: <TidalLogo /> },
  { name: 'SoundCloud',  color: '#ff5500', textColor: '#fff', buildUrl: (q) => `https://soundcloud.com/search?q=${q}`,             logo: <SoundCloudLogo /> },
]

export function ListenOn({ type, artist, album, track, variant = 'full', className }: ListenOnProps) {
  const query = buildQuery(type, artist, album, track)

  if (variant === 'icons') {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        {SERVICES.map((s) => (
          <a key={s.name} href={s.buildUrl(query)} target="_blank" rel="noopener noreferrer"
            title={`Open in ${s.name}`} aria-label={`Open in ${s.name}`}
            className="block rounded-full transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2">
            {s.logo}
          </a>
        ))}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap gap-1', className)}>
        {SERVICES.map((s) => (
          <a key={s.name} href={s.buildUrl(query)} target="_blank" rel="noopener noreferrer"
            title={`Open in ${s.name}`} aria-label={`Open in ${s.name}`}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2"
            style={{ backgroundColor: s.color }}>
            {s.logo}
          </a>
        ))}
      </div>
    )
  }

  // full variant
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto pb-0.5', className)}>
      {SERVICES.map((s) => (
        <a key={s.name} href={s.buildUrl(query)} target="_blank" rel="noopener noreferrer"
          title={`Open in ${s.name}`} aria-label={`Open in ${s.name}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2 shrink-0"
          style={{ backgroundColor: s.color, color: s.textColor }}>
          {s.logo}
          <span>{s.name}</span>
        </a>
      ))}
    </div>
  )
}

export function ListenOnSpotify({ artist, track, album }: { artist: string; track?: string; album?: string }) {
  const type: ListenOnProps['type'] = track ? 'track' : album ? 'album' : 'artist'
  return <ListenOn type={type} artist={artist} track={track} album={album} variant="compact" />
}
