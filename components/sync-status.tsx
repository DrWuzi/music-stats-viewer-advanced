'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const COOLDOWN = 5 * 60

function rel(date: Date | string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function SyncStatus({
  lastSyncedAt,
  isOwner,
}: {
  lastSyncedAt: Date | null
  isOwner: boolean
}) {
  const router = useRouter()
  const [cooldown, setCooldown] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncedAt, setSyncedAt] = useState(lastSyncedAt)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      if (res.status === 429) {
        const data = await res.json()
        setCooldown(data.retryAfter ?? COOLDOWN)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setSyncedAt(new Date(data.lastSyncedAt))
        setCooldown(COOLDOWN)
        router.refresh()
      }
    } finally {
      setSyncing(false)
    }
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant="secondary" suppressHydrationWarning>
        {syncedAt ? `Synced ${rel(syncedAt)}` : 'Never synced'}
      </Badge>
      {isOwner && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={syncing || cooldown > 0}
        >
          {syncing ? 'Syncing…' : cooldown > 0 ? `Sync (${cooldown}s)` : 'Sync now'}
        </Button>
      )}
    </div>
  )
}
