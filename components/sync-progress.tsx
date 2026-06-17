'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface SyncProgressProps {
  username: string
  onComplete?: () => void
}

export function SyncProgress({ username, onComplete }: SyncProgressProps) {
  const [synced, setSynced] = useState(false)
  const [scrobbleCount, setScrobbleCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`/api/sync-status?username=${encodeURIComponent(username)}`)
        if (!res.ok) return
        const data = await res.json()
        setScrobbleCount(data.scrobbleCount ?? 0)
        if (data.synced) {
          setSynced(true)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          onComplete?.()
        }
      } catch {
        // silently ignore fetch errors during polling
      }
    }

    checkStatus()
    intervalRef.current = setInterval(checkStatus, 3000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [username, onComplete])

  if (synced) return null

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      <span>
        Syncing your scrobbles from Last.fm
        {scrobbleCount > 0 && (
          <span className="ml-1 font-medium text-foreground">
            — {scrobbleCount.toLocaleString('en-US')} imported so far…
          </span>
        )}
      </span>
    </div>
  )
}
