'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Bell, Users, TrendingUp, Trophy, Music, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

interface Notification {
  id: string
  type: 'friend' | 'chart' | 'milestone' | 'release'
  title: string
  body: string
  href?: string
  timestamp: string
}

function typeIcon(type: Notification['type']) {
  switch (type) {
    case 'friend': return <Users className="h-4 w-4 shrink-0" style={{ color: 'var(--primary)' }} />
    case 'chart': return <TrendingUp className="h-4 w-4 shrink-0 text-blue-500" />
    case 'milestone': return <Trophy className="h-4 w-4 shrink-0 text-yellow-500" />
    case 'release': return <Music className="h-4 w-4 shrink-0 text-green-500" />
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NotificationsButton({ username }: { username: string }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [read, setRead] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleOpen() {
    setOpen((v) => !v)
    if (!fetched) {
      setLoading(true)
      try {
        const res = await fetch(`/api/notifications?username=${encodeURIComponent(username)}`)
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications ?? [])
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
        setFetched(true)
      }
    }
    // Mark as read when panel is opened
    setRead(true)
  }

  const hasUnread = !read && fetched && notifications.length > 0

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        onClick={handleOpen}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {hasUnread && (
          <span
            className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"
            aria-hidden
          />
        )}
      </Button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-80 rounded-xl border shadow-lg"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-semibold">Notifications</span>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications" size="compact" />
            ) : (
              <ul>
                {notifications.slice(0, 15).map((n) => (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        className="flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-0"
                        style={{ borderColor: 'var(--border)' }}
                        onClick={() => setOpen(false)}
                      >
                        <div className="mt-0.5">{typeIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{n.body}</p>
                          <p className="text-xs text-muted-foreground mt-1">{relativeTime(n.timestamp)}</p>
                        </div>
                      </Link>
                    ) : (
                      <div
                        className="flex gap-3 px-4 py-3 border-b last:border-0"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <div className="mt-0.5">{typeIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{n.body}</p>
                          <p className="text-xs text-muted-foreground mt-1">{relativeTime(n.timestamp)}</p>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
