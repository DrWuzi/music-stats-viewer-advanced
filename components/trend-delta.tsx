'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TrendDeltaProps {
  current: number
  previous: number
  label?: string
}

export function TrendDelta({ current, previous, label }: TrendDeltaProps) {
  const pct =
    previous === 0
      ? current === 0
        ? 0
        : 100
      : Math.round(((current - previous) / Math.abs(previous)) * 100)

  const isPositive = pct >= 2
  const isNegative = pct <= -2

  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-medium"
      style={{
        color: isPositive
          ? 'var(--color-success, var(--success, #22c55e))'
          : isNegative
            ? 'var(--destructive)'
            : 'var(--muted-foreground)',
      }}
      title={label}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3 shrink-0" aria-hidden />
      ) : isNegative ? (
        <TrendingDown className="h-3 w-3 shrink-0" aria-hidden />
      ) : (
        <Minus className="h-3 w-3 shrink-0" aria-hidden />
      )}
      {isPositive ? '+' : ''}
      {pct}%
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
