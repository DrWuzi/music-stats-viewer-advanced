'use client'

import { useMemo } from 'react'
import { Flame } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface ListeningStreaksProps {
  scrobbles: { scrobbledAt: Date | string }[]
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function computeStreaks(scrobbles: { scrobbledAt: Date | string }[]): {
  current: number
  longest: number
} {
  if (scrobbles.length === 0) return { current: 0, longest: 0 }

  const uniqueDates = Array.from(
    new Set(scrobbles.map((s) => toDateString(new Date(s.scrobbledAt))))
  ).sort()

  if (uniqueDates.length === 0) return { current: 0, longest: 0 }

  // Longest streak
  let longest = 1
  let run = 1
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1])
    const curr = new Date(uniqueDates[i])
    const diffMs = curr.getTime() - prev.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      run++
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }

  // Current streak: count consecutive days backward from today
  const today = toDateString(new Date())
  const dateSet = new Set(uniqueDates)
  let current = 0
  const cursor = new Date()
  while (true) {
    const key = toDateString(cursor)
    if (dateSet.has(key)) {
      current++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }

  // If today has no scrobble, check if yesterday starts a streak
  if (current === 0) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yKey = toDateString(yesterday)
    if (dateSet.has(yKey)) {
      const c2 = new Date(yesterday)
      while (true) {
        const key = toDateString(c2)
        if (dateSet.has(key)) {
          current++
          c2.setDate(c2.getDate() - 1)
        } else {
          break
        }
      }
    }
  }

  return { current, longest }
}

export function ListeningStreaks({ scrobbles }: ListeningStreaksProps) {
  const { current, longest } = useMemo(() => computeStreaks(scrobbles), [scrobbles])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listening Streaks</CardTitle>
      </CardHeader>
      <CardContent>
        {scrobbles.length === 0 ? (
          <EmptyState icon={Flame} title="No scrobble data yet." size="compact" />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                {current > 0 && <Flame className="h-5 w-5 text-orange-500" />}
                <span className="text-4xl font-bold">{current}</span>
              </div>
              <span className="text-sm text-muted-foreground">days</span>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl font-bold">{longest}</span>
              <span className="text-sm text-muted-foreground">days</span>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Longest
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
