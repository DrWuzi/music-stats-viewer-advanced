'use client'

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { EmptyState } from '@/components/ui/empty-state'

interface CoArtist {
  name: string
  sharedDays: number
}

interface AlsoListenedSidebarProps {
  username: string
  artist: string
  open: boolean
  onClose: () => void
}

export function AlsoListenedSidebar({ username, artist, open, onClose }: AlsoListenedSidebarProps) {
  const [data, setData] = useState<CoArtist[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setLoading(true)
    setError(null)
    setData([])

    fetch(`/api/also-listened?username=${encodeURIComponent(username)}&artist=${encodeURIComponent(artist)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((e) => Promise.reject(e.error ?? 'Failed to load'))
        return res.json()
      })
      .then((json: CoArtist[]) => {
        setData(json)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(typeof err === 'string' ? err : 'Failed to load data')
        setLoading(false)
      })
  }, [open, username, artist])

  const maxDays = data[0]?.sharedDays ?? 1

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle className="text-base leading-snug">
            When you listen to <span className="text-primary">{artist}</span>, you also play:
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3.5 rounded bg-muted animate-pulse" style={{ width: `${60 + (i % 3) * 10}%` }} />
                  <div className="h-2 rounded bg-muted animate-pulse" style={{ width: `${40 + (i % 4) * 8}%` }} />
                </div>
              ))}
            </>
          )}

          {!loading && error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && data.length === 0 && (
            <EmptyState icon={Users} title="No co-listening data found." size="compact" />
          )}

          {!loading && !error && data.map((item) => {
            const pct = Math.round((item.sharedDays / maxDays) * 100)
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate pr-2">{item.name}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {item.sharedDays} {item.sharedDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
