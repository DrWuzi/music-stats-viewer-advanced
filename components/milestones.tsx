'use client'

import { Check, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

const MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000]

interface MilestonesProps {
  totalScrobbles: number
}

export function Milestones({ totalScrobbles }: MilestonesProps) {
  const reached = MILESTONES.filter((m) => totalScrobbles >= m)
  const next = MILESTONES.find((m) => totalScrobbles < m) ?? null

  const progressPct =
    next !== null
      ? Math.min(100, Math.round((totalScrobbles / next) * 100))
      : 100

  const prevMilestone =
    next !== null ? (reached[reached.length - 1] ?? 0) : MILESTONES[MILESTONES.length - 1]

  const rangeProgress =
    next !== null && next !== prevMilestone
      ? Math.min(
          100,
          Math.round(((totalScrobbles - prevMilestone) / (next - prevMilestone)) * 100)
        )
      : 100

  return (
    <Card>
      <CardHeader>
        <CardTitle>Milestones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reached.length === 0 && next === null ? (
          <EmptyState icon={Trophy} title="No milestones yet." size="compact" />
        ) : (
          <>
            {reached.length > 0 && (
              <ul className="space-y-1">
                {reached.map((m) => (
                  <li key={m} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>{m.toLocaleString('en-US')}</span>
                  </li>
                ))}
              </ul>
            )}
            {next !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {totalScrobbles.toLocaleString('en-US')} /{' '}
                    {next.toLocaleString('en-US')}
                  </span>
                  <span>{rangeProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${rangeProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {(next - totalScrobbles).toLocaleString('en-US')} scrobbles until{' '}
                  {next.toLocaleString('en-US')}
                </p>
              </div>
            )}
            {next === null && (
              <p className="text-sm text-muted-foreground">All milestones reached!</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
