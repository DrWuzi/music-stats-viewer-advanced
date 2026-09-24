'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { X, Radio } from 'lucide-react'
import { useNowPlaying } from '@/components/now-playing-context'

interface ScrobbleToastProps {
  username: string
}

/** Toasts the newest scrobble as it comes in, but never for anything that was
 * already scrobbled before this component mounted (no toast storm on load). */
export function ScrobbleToast({ username }: ScrobbleToastProps) {
  const { data } = useNowPlaying()
  const [visible, setVisible] = useState(false)
  const [current, setCurrent] = useState<{ artist: string; track: string } | null>(null)
  const baselineRef = useRef<number | null>(null)
  const lastShownRef = useRef<number | null>(null)

  useEffect(() => {
    const latest = data?.recent?.[0]
    if (!latest) return
    const latestTime = new Date(latest.scrobbledAt).getTime()

    if (baselineRef.current === null) {
      baselineRef.current = latestTime
      return
    }

    if (latestTime <= baselineRef.current || lastShownRef.current === latestTime) return

    lastShownRef.current = latestTime
    baselineRef.current = latestTime
    setCurrent({ artist: latest.artist, track: latest.track })
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [data?.recent])

  if (!visible || !current) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="shadow-xl border-primary/20 max-w-xs">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className="h-5 w-5 text-primary shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight truncate">{username} just scrobbled</p>
                <p className="text-muted-foreground text-sm truncate">
                  {current.track} — {current.artist}
                </p>
              </div>
            </div>
            <button
              onClick={() => setVisible(false)}
              className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
