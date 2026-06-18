'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface DateRangePickerProps {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
}

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '180d', days: 180 },
  { label: '1y', days: 365 },
] as const

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [error, setError] = useState<string | null>(null)

  const handlePreset = (days: number) => {
    const toDate = new Date()
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)
    setError(null)
    onChange(toYMD(fromDate), toYMD(toDate))
  }

  const handleAll = () => {
    setError(null)
    onChange(null, null)
  }

  const handleFromChange = (value: string) => {
    const newFrom = value || null
    if (newFrom && to && newFrom > to) {
      setError('End must be after start')
    } else {
      setError(null)
    }
    onChange(newFrom, to)
  }

  const handleToChange = (value: string) => {
    const newTo = value || null
    if (from && newTo && from > newTo) {
      setError('End must be after start')
    } else {
      setError(null)
    }
    onChange(from, newTo)
  }

  const rangeDisplay =
    from && to
      ? `${formatDisplay(from)} – ${formatDisplay(to)}`
      : from
      ? `From ${formatDisplay(from)}`
      : to
      ? `Until ${formatDisplay(to)}`
      : 'All time'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(({ label, days }) => (
          <Button
            key={label}
            size="sm"
            variant={
              (() => {
                const toDate = new Date()
                const expectedFrom = new Date()
                expectedFrom.setDate(expectedFrom.getDate() - days)
                return from === toYMD(expectedFrom) && to === toYMD(toDate) ? 'default' : 'outline'
              })()
            }
            onClick={() => handlePreset(days)}
          >
            {label}
          </Button>
        ))}
        <Button
          size="sm"
          variant={!from && !to ? 'default' : 'outline'}
          onClick={handleAll}
        >
          All
        </Button>
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={from ?? ''}
            onChange={(e) => handleFromChange(e.target.value)}
            className="h-8 w-36 text-sm"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="date"
            value={to ?? ''}
            onChange={(e) => handleToChange(e.target.value)}
            className="h-8 w-36 text-sm"
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">{rangeDisplay}</p>
    </div>
  )
}
