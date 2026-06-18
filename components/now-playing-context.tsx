'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

export type NowPlayingData = {
  nowPlaying: boolean
  track?: string
  artist?: string
  album?: string
}

type NowPlayingContextValue = {
  data: NowPlayingData | null
  isLoading: boolean
}

const NowPlayingContext = createContext<NowPlayingContextValue>({
  data: null,
  isLoading: true,
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
    const interval = setInterval(fetchNowPlaying, 30_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [username])

  return (
    <NowPlayingContext.Provider value={{ data, isLoading }}>
      {children}
    </NowPlayingContext.Provider>
  )
}

export function useNowPlaying() {
  return useContext(NowPlayingContext)
}
