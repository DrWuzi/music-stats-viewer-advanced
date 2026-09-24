'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

export type RecentScrobble = {
  artist: string
  track: string
  album: string | null
  scrobbledAt: string
}

export type NowPlayingData = {
  nowPlaying: boolean
  track?: string
  artist?: string
  album?: string
  recent: RecentScrobble[]
}

type NowPlayingContextValue = {
  data: NowPlayingData | null
  isLoading: boolean
  username: string
}

const NowPlayingContext = createContext<NowPlayingContextValue>({
  data: null,
  isLoading: true,
  username: '',
})

type ProviderProps = {
  username: string
  children: React.ReactNode
}

export function NowPlayingProvider({ username, children }: ProviderProps) {
  const [data, setData] = useState<NowPlayingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const usernameRef = useRef(username)
  usernameRef.current = username

  useEffect(() => {
    let cancelled = false

    const fetchNowPlaying = async () => {
      try {
        const res = await fetch(
          `/api/now-playing?username=${encodeURIComponent(usernameRef.current)}`,
          { cache: 'no-store' },
        )
        if (!cancelled && res.ok) {
          const json: NowPlayingData = await res.json()
          setData(json)
        }
      } catch {
        // silently ignore fetch errors
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchNowPlaying()
    const interval = setInterval(fetchNowPlaying, 22_500)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [username])

  return (
    <NowPlayingContext.Provider value={{ data, isLoading, username }}>
      {children}
    </NowPlayingContext.Provider>
  )
}

export function useNowPlaying() {
  return useContext(NowPlayingContext)
}
