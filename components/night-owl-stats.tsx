'use client'

import { useMemo } from 'react'
import { Moon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface NightOwlStatsProps {
  scrobbles: { scrobbledAt: Date | string }[]
}

const PERIODS = [
  { label: 'Morning', emoji: '☀️', range: '6–11' },
  { label: 'Afternoon', emoji: '🌤️', range: '12–17' },
  { label: 'Evening', emoji: '🌆', range: '18–22' },
  { label: 'Night', emoji: '🌙', range: '23–5' },
] as const

type PeriodLabel = (typeof PERIODS)[number]['label']

function getPeriod(hour: number): PeriodLabel {
  if (hour >= 6 && hour <= 11) return 'Morning'
  if (hour >= 12 && hour <= 17) return 'Afternoon'
  if (hour >= 18 && hour <= 22) return 'Evening'
  return 'Night'
}

export function NightOwlStats({ scrobbles }: NightOwlStatsProps) {
  const { counts, total, dominant } = useMemo(() => {
    const counts: Record<PeriodLabel, number> = {
      Morning: 0,
      Afternoon: 0,
      Evening: 0,
      Night: 0,
    }

    for (const s of scrobbles) {
      const hour = new Date(s.scrobbledAt).getHours()
      counts[getPeriod(hour)]++
    }

    const total = scrobbles.length
    let dominant: PeriodLabel = 'Morning'
    let max = 0
    for (const [label, count] of Object.entries(counts) as [PeriodLabel, number][]) {
      if (count > max) {
        max = count
        dominant = label
      }
    }

    return { counts, total, dominant }
  }, [scrobbles])

  if (scrobbles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>When You Listen</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Moon} title="No scrobble data yet." size="compact" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>When You Listen</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {PERIODS.map(({ label, emoji, range }) => {
            const count = counts[label]
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            const isDominant = label === dominant

            return (
              <div
                key={label}
                className="flex flex-col gap-1 rounded-lg border p-3 relative"
              >
                {isDominant && (
                  <Badge className="absolute top-2 right-2 text-xs px-1.5 py-0">
                    Top
                  </Badge>
                )}
                <span className="text-xl">{emoji}</span>
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{range}h</span>
                <span className="text-2xl font-bold">{count.toLocaleString('en-US')}</span>
                <span className="text-xs text-muted-foreground">{pct}% of total</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
