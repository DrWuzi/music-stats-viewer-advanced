'use client'

import React, { useMemo, useState } from 'react'

interface Props {
  scrobbles: { scrobbledAt: Date }[]
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function getCellStyle(count: number): React.CSSProperties {
  if (count === 0) {
    return { backgroundColor: 'var(--muted)' }
  } else if (count <= 3) {
    return { backgroundColor: 'color-mix(in oklch, var(--primary) 20%, transparent)' }
  } else if (count <= 9) {
    return { backgroundColor: 'color-mix(in oklch, var(--primary) 50%, transparent)' }
  } else if (count <= 20) {
    return { backgroundColor: 'color-mix(in oklch, var(--primary) 75%, transparent)' }
  } else {
    return { backgroundColor: 'var(--primary)' }
  }
}

interface Cell {
  date: Date
  key: string
  inRange: boolean
}

export function ScrobbleHeatmap({ scrobbles }: Props) {
  const [tooltip, setTooltip] = useState<{ key: string; x: number; y: number } | null>(null)

  const { grid, monthHeaders, countByDay } = useMemo(() => {
    // Build count map
    const countByDay: Record<string, number> = {}
    for (const s of scrobbles) {
      const k = toDateKey(new Date(s.scrobbledAt))
      countByDay[k] = (countByDay[k] ?? 0) + 1
    }

    // Grid spans exactly 1 year back from today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // End = today; start = 364 days ago (365-day window inclusive)
    const gridEnd = new Date(today)
    const gridStart = addDays(today, -364)

    // Align gridStart to the previous Sunday
    const startDow = gridStart.getDay() // 0 = Sunday
    const alignedStart = addDays(gridStart, -startDow)

    // Align gridEnd to the next Saturday
    const endDow = gridEnd.getDay()
    const alignedEnd = addDays(gridEnd, 6 - endDow)

    // Build a flat array of cells week-by-week (7 rows per column)
    // We'll store as columns (each column = one week, 7 days Sun-Sat)
    const columns: Cell[][] = []
    let cur = new Date(alignedStart)
    while (cur <= alignedEnd) {
      const col: Cell[] = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(cur)
        date.setDate(cur.getDate() + d)
        col.push({
          date,
          key: toDateKey(date),
          inRange: date >= gridStart && date <= gridEnd,
        })
      }
      columns.push(col)
      cur = addDays(cur, 7)
    }

    // Month headers: for each column, check if any day in the column is the 1st of a month
    // We emit a label at the first column where a new month appears
    const monthHeaders: Array<{ colIndex: number; label: string }> = []
    let lastLabeledMonth = -1
    columns.forEach((col, ci) => {
      for (const cell of col) {
        if (cell.date.getDate() === 1 && cell.date.getMonth() !== lastLabeledMonth && cell.inRange) {
          lastLabeledMonth = cell.date.getMonth()
          monthHeaders.push({ colIndex: ci, label: MONTH_NAMES[cell.date.getMonth()] })
          break
        }
      }
    })

    return { grid: columns, monthHeaders, countByDay }
  }, [scrobbles])

  const CELL = 13
  const GAP = 2

  const tooltipCell = tooltip ? { key: tooltip.key } : null
  const tooltipCount = tooltipCell ? (countByDay[tooltipCell.key] ?? 0) : 0
  const tooltipDate = tooltipCell
    ? new Date(tooltipCell.key + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : ''

  return (
    <div style={{ fontFamily: 'inherit', position: 'relative' }}>
      {/* Scrollable wrapper for mobile */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'inline-flex', gap: 0, paddingBottom: 4 }}>
          {/* Day-of-week labels column */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: `${CELL}px repeat(7, ${CELL}px)`,
              gap: `${GAP}px`,
              marginRight: GAP * 2,
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            {/* Top-left spacer aligns with month header row */}
            <div style={{ height: CELL }} />
            {DAY_LABELS.map((label, i) => (
              <div
                key={label}
                style={{
                  height: CELL,
                  fontSize: 9,
                  lineHeight: `${CELL}px`,
                  color: 'var(--muted-foreground)',
                  textAlign: 'right',
                  paddingRight: 2,
                  // Only show Mon (1), Wed (3), Fri (5)
                  visibility: i === 1 || i === 3 || i === 5 ? 'visible' : 'hidden',
                }}
              >
                {label.slice(0, 1)}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {/* Month labels row */}
            <div
              style={{
                position: 'relative',
                height: CELL,
                marginBottom: GAP,
              }}
            >
              {monthHeaders.map(({ colIndex, label }) => (
                <span
                  key={`${label}-${colIndex}`}
                  style={{
                    position: 'absolute',
                    left: colIndex * (CELL + GAP),
                    fontSize: 9,
                    lineHeight: `${CELL}px`,
                    color: 'var(--muted-foreground)',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Week columns grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${grid.length}, ${CELL}px)`,
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gap: `${GAP}px`,
                gridAutoFlow: 'column',
              }}
            >
              {grid.map((col, ci) =>
                col.map((cell, ri) => {
                  if (!cell.inRange) {
                    return (
                      <div
                        key={`oor-${ci}-${ri}`}
                        style={{ width: CELL, height: CELL, borderRadius: 2 }}
                      />
                    )
                  }
                  const count = countByDay[cell.key] ?? 0
                  const isHovered = tooltip?.key === cell.key
                  return (
                    <div
                      key={cell.key}
                      onMouseEnter={(e) => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                        setTooltip({ key: cell.key, x: rect.left, y: rect.top })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 2,
                        cursor: 'default',
                        outline: isHovered ? '2px solid var(--primary)' : 'none',
                        outlineOffset: 1,
                        transition: 'outline 0.1s',
                        ...getCellStyle(count),
                      }}
                    />
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + CELL / 2,
            top: tooltip.y - 36,
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 11,
            color: 'var(--foreground)',
            pointerEvents: 'none',
            zIndex: 50,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px color-mix(in oklch, var(--foreground) 15%, transparent)',
          }}
        >
          <span style={{ fontWeight: 600 }}>{tooltipCount}</span>
          <span style={{ color: 'var(--muted-foreground)', marginLeft: 4 }}>
            scrobble{tooltipCount !== 1 ? 's' : ''} on {tooltipDate}
          </span>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 8,
          justifyContent: 'flex-end',
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>Less</span>
        {[0, 1, 4, 10, 21].map((threshold, i) => (
          <div
            key={i}
            title={
              threshold === 0
                ? '0 scrobbles'
                : threshold === 1
                ? '1–3 scrobbles'
                : threshold === 4
                ? '4–9 scrobbles'
                : threshold === 10
                ? '10–20 scrobbles'
                : '20+ scrobbles'
            }
            style={{
              width: CELL,
              height: CELL,
              borderRadius: 2,
              ...getCellStyle(threshold),
            }}
          />
        ))}
        <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>More</span>
      </div>
    </div>
  )
}
