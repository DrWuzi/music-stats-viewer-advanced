'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { AlertTriangle, Clock } from 'lucide-react'

interface ListeningGapProps {
  scrobbles: { scrobbledAt: Date | string }[]
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function computeGaps(scrobbles: { scrobbledAt: Date | string }[]) {
  if (scrobbles.length === 0) return null

  const sorted = [...scrobbles]
    .map((s) => new Date(s.scrobbledAt))
    .sort((a, b) => a.getTime() - b.getTime())

  let maxGapMs = 0
  let gapStart: Date = sorted[0]
  let gapEnd: Date = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].getTime() - sorted[i - 1].getTime()
    if (diff > maxGapMs) {
      maxGapMs = diff
      gapStart = sorted[i - 1]
      gapEnd = sorted[i]
    }
  }

  const longestGapDays = Math.floor(maxGapMs / 86400000)
  const lastScrobble = sorted[sorted.length - 1]
  const currentGapDays = Math.floor((Date.now() - lastScrobble.getTime()) / 86400000)

  return { longestGapDays, gapStart, gapEnd, lastScrobble, currentGapDays }
}

export function ListeningGap({ scrobbles }: ListeningGapProps) {
  const gaps = useMemo(() => computeGaps(scrobbles), [scrobbles])

  if (!gaps) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listening Gaps</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Clock} title="No scrobble data yet." size="compact" />
        </CardContent>
      </Card>
    )
  }

  const { longestGapDays, gapStart, gapEnd, currentGapDays } = gaps

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listening Gaps</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">
              Longest break: {longestGapDays.toLocaleString('en-US')} days
            </p>
            <p className="text-xs text-muted-foreground">
              {formatMonthYear(gapStart)} – {formatMonthYear(gapEnd)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">
              Last scrobble:{' '}
              {currentGapDays === 0 ? 'Today' : `${currentGapDays.toLocaleString('en-US')} days ago`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
