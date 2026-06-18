'use client'

import React, { useMemo } from 'react'

interface Props {
  scrobbles: { scrobbledAt: Date }[]
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function getIntensityStyle(count: number, max: number): React.CSSProperties {
  if (count === 0) {
    return {
      backgroundColor: 'color-mix(in oklch, var(--primary) 10%, transparent)',
    }
  }
  const ratio = max > 0 ? count / max : 0
  if (ratio < 0.25) {
    return { backgroundColor: 'color-mix(in oklch, var(--primary) 30%, transparent)' }
  } else if (ratio < 0.5) {
    return { backgroundColor: 'color-mix(in oklch, var(--primary) 55%, transparent)' }
  } else if (ratio < 0.75) {
    return { backgroundColor: 'color-mix(in oklch, var(--primary) 75%, transparent)' }
  } else {
    return { backgroundColor: 'var(--primary)' }
  }
}

export function StreakCalendar({ scrobbles }: Props) {
  const { weeks, monthLabels, countByDay, maxCount, currentStreak, longestStreak } =
    useMemo(() => {
      // Build count map
      const countByDay: Record<string, number> = {}
      for (const s of scrobbles) {
        const k = toDateKey(new Date(s.scrobbledAt))
        countByDay[k] = (countByDay[k] ?? 0) + 1
      }

      // Determine grid start: go back 52 weeks from today, aligned to Sunday
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayDay = today.getDay() // 0 = Sunday
      // End of grid = last Saturday on or after today (pad to end of week)
      const daysToEndOfWeek = 6 - todayDay
      const gridEnd = addDays(today, daysToEndOfWeek)
      // Grid covers 52 weeks = 364 days; start = gridEnd - 363
      const gridStart = addDays(gridEnd, -363)

      // Build weeks array: each week is 7 days (Sun–Sat)
      const weeks: Array<Array<{ date: Date; key: string } | null>> = []
      let current = new Date(gridStart)
      while (current <= gridEnd) {
        const week: Array<{ date: Date; key: string } | null> = []
        for (let d = 0; d < 7; d++) {
          const cell = new Date(current)
          cell.setDate(current.getDate() + d)
          if (cell > gridEnd) {
            week.push(null)
          } else {
            week.push({ date: cell, key: toDateKey(cell) })
          }
        }
        weeks.push(week)
        current = addDays(current, 7)
      }

      // Max count for intensity scaling
      const maxCount = Math.max(1, ...Object.values(countByDay))

      // Month labels: for each week column, check if first day of a month appears
      const monthLabels: Array<{ weekIndex: number; label: string }> = []
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      let lastMonth = -1
      weeks.forEach((week, wi) => {
        for (const cell of week) {
          if (cell && cell.date.getDate() === 1 && cell.date.getMonth() !== lastMonth) {
            lastMonth = cell.date.getMonth()
            monthLabels.push({ weekIndex: wi, label: monthNames[lastMonth] })
            break
          }
        }
      })

      // Current streak (consecutive days with scrobbles, ending today)
      let currentStreak = 0
      let check = new Date(today)
      while (true) {
        const k = toDateKey(check)
        if ((countByDay[k] ?? 0) > 0) {
          currentStreak++
          check = addDays(check, -1)
        } else {
          break
        }
      }

      // Longest streak
      const allKeys = Object.keys(countByDay).sort()
      let longestStreak = 0
      let streak = 0
      if (allKeys.length > 0) {
        const first = new Date(allKeys[0])
        const last = new Date(allKeys[allKeys.length - 1])
        let d = new Date(first)
        while (d <= last) {
          const k = toDateKey(d)
          if ((countByDay[k] ?? 0) > 0) {
            streak++
            if (streak > longestStreak) longestStreak = streak
          } else {
            streak = 0
          }
          d = addDays(d, 1)
        }
      }

      return { weeks, monthLabels, countByDay, maxCount, currentStreak, longestStreak }
    }, [scrobbles])

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const CELL = 13 // px per cell
  const GAP = 2   // px gap

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {/* Scrollable wrapper for narrow screens */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'inline-flex', gap: 0 }}>
          {/* Day-of-week labels column */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: `${CELL}px repeat(7, ${CELL}px)`,
              gap: `${GAP}px`,
              marginRight: `${GAP * 2}px`,
              alignItems: 'center',
            }}
          >
            {/* Empty top-left corner (aligns with month label row) */}
            <div style={{ height: CELL }} />
            {dayLabels.map((label, i) => (
              <div
                key={label}
                style={{
                  height: CELL,
                  fontSize: 9,
                  lineHeight: `${CELL}px`,
                  color: 'var(--muted-foreground, #888)',
                  textAlign: 'right',
                  paddingRight: 2,
                  // Show only Mon, Wed, Fri to avoid crowding
                  visibility: i % 2 === 1 ? 'visible' : 'hidden',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ position: 'relative' }}>
            {/* Month labels row */}
            <div
              style={{
                position: 'relative',
                height: CELL,
                marginBottom: GAP,
              }}
            >
              {monthLabels.map(({ weekIndex, label }) => (
                <span
                  key={`${label}-${weekIndex}`}
                  style={{
                    position: 'absolute',
                    left: weekIndex * (CELL + GAP),
                    fontSize: 9,
                    lineHeight: `${CELL}px`,
                    color: 'var(--muted-foreground, #888)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Week columns */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${weeks.length}, ${CELL}px)`,
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gap: `${GAP}px`,
                gridAutoFlow: 'column',
              }}
            >
              {weeks.map((week, wi) =>
                week.map((cell, di) => {
                  if (!cell) {
                    return (
                      <div
                        key={`empty-${wi}-${di}`}
                        style={{ width: CELL, height: CELL }}
                      />
                    )
                  }
                  const count = countByDay[cell.key] ?? 0
                  const dateStr = cell.date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                  return (
                    <div
                      key={cell.key}
                      title={`${dateStr}: ${count} scrobble${count !== 1 ? 's' : ''}`}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 2,
                        cursor: 'default',
                        ...getIntensityStyle(count, maxCount),
                      }}
                    />
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginTop: 6,
          justifyContent: 'flex-end',
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--muted-foreground, #888)' }}>Less</span>
        {[0, 0.2, 0.45, 0.7, 1].map((ratio, i) => {
          const style: React.CSSProperties =
            ratio === 0
              ? { backgroundColor: 'color-mix(in oklch, var(--primary) 10%, transparent)' }
              : ratio < 0.25
              ? { backgroundColor: 'color-mix(in oklch, var(--primary) 30%, transparent)' }
              : ratio < 0.5
              ? { backgroundColor: 'color-mix(in oklch, var(--primary) 55%, transparent)' }
              : ratio < 0.75
              ? { backgroundColor: 'color-mix(in oklch, var(--primary) 75%, transparent)' }
              : { backgroundColor: 'var(--primary)' }
          return (
            <div
              key={i}
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 2,
                ...style,
              }}
            />
          )
        })}
        <span style={{ fontSize: 10, color: 'var(--muted-foreground, #888)' }}>More</span>
      </div>

      {/* Streak stats */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          marginTop: 10,
          fontSize: 13,
          color: 'var(--foreground, inherit)',
        }}
      >
        <span>
          <span style={{ fontWeight: 600 }}>{currentStreak}</span>
          <span style={{ color: 'var(--muted-foreground, #888)', marginLeft: 4 }}>
            day current streak
          </span>
        </span>
        <span>
          <span style={{ fontWeight: 600 }}>{longestStreak}</span>
          <span style={{ color: 'var(--muted-foreground, #888)', marginLeft: 4 }}>
            day longest streak
          </span>
        </span>
      </div>
    </div>
  )
}
