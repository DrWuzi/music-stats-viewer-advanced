'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { X } from 'lucide-react'

const MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000]

const MILESTONE_EMOJIS: Record<number, string> = {
  1000: '🎵',
  5000: '🎶',
  10000: '🎸',
  25000: '🎤',
  50000: '🏆',
  100000: '🌟',
  250000: '💫',
  500000: '🔥',
  1000000: '👑',
}

interface MilestoneToastProps {
  totalScrobbles: number
}

export function MilestoneToast({ totalScrobbles }: MilestoneToastProps) {
  const [visible, setVisible] = useState(false)
  const [milestone, setMilestone] = useState<number | null>(null)

  useEffect(() => {
    const currentMilestone = [...MILESTONES]
      .reverse()
      .find((m) => m <= totalScrobbles) ?? null

    if (!currentMilestone) return

    try {
      const lastCelebrated = parseInt(localStorage.getItem('lastMilestoneCelebrated') ?? '0', 10)
      if (currentMilestone > lastCelebrated) {
        setMilestone(currentMilestone)
        setVisible(true)
        localStorage.setItem('lastMilestoneCelebrated', String(currentMilestone))

        const timer = setTimeout(() => setVisible(false), 5000)
        return () => clearTimeout(timer)
      }
    } catch {
      // localStorage unavailable
    }
  }, [totalScrobbles])

  if (!visible || milestone === null) return null

  const emoji = MILESTONE_EMOJIS[milestone] ?? '🎵'

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="shadow-xl border-primary/20 max-w-xs">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{emoji}</span>
              <div>
                <p className="font-semibold text-sm leading-tight">Milestone reached!</p>
                <p className="text-muted-foreground text-sm">
                  {milestone.toLocaleString()} scrobbles!
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
