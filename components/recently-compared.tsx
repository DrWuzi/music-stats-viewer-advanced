'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface RecentlyComparedProps {
  onSelect: (username: string) => void
}

export function saveRecentComparison(username: string): void {
  try {
    const raw = localStorage.getItem('recentlyCompared')
    const current: string[] = raw ? (JSON.parse(raw) as string[]) : []
    const updated = [username, ...current]
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 5)
    localStorage.setItem('recentlyCompared', JSON.stringify(updated))
  } catch {
    // localStorage unavailable
  }
}

export function RecentlyCompared({ onSelect }: RecentlyComparedProps) {
  const [recents, setRecents] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('recentlyCompared')
      if (raw) {
        setRecents(JSON.parse(raw) as string[])
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

  function remove(username: string) {
    const updated = recents.filter((u) => u !== username)
    setRecents(updated)
    try {
      localStorage.setItem('recentlyCompared', JSON.stringify(updated))
    } catch {
      // localStorage unavailable
    }
  }

  if (recents.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Recent:</span>
      {recents.map((username) => (
        <Badge
          key={username}
          variant="secondary"
          className="flex items-center gap-1 pr-1 cursor-pointer select-none"
        >
          <span onClick={() => onSelect(username)} className="cursor-pointer">
            {username}
          </span>
          <button
            onClick={() => remove(username)}
            className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
            aria-label={`Remove ${username}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  )
}
