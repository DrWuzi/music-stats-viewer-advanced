'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type DayRange = 30 | 180 | 360

function buildData(scrobbles: { scrobbledAt: Date | string }[], days: DayRange) {
  const counts: Record<string, number> = {}
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    counts[d.toISOString().slice(0, 10)] = 0
  }
  for (const s of scrobbles) {
    const k = new Date(s.scrobbledAt).toISOString().slice(0, 10)
    if (k in counts) counts[k]++
  }
  return Object.entries(counts).map(([date, count]) => ({ date, label: date.slice(5), count }))
}

function xAxisInterval(days: DayRange): number {
  if (days === 30) return 6
  if (days === 180) return 29
  return 59
}

interface DayTrack {
  artist: string
  album: string | null
  track: string
  scrobbledAt: string
}

export function StatsChart({
  username,
  scrobbles,
}: {
  username: string
  scrobbles: { scrobbledAt: Date | string }[]
}) {
  const [days, setDays] = useState<DayRange>(30)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [dayTracks, setDayTracks] = useState<DayTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const data = buildData(scrobbles, days)

  useEffect(() => {
    const handler = (e: Event) => { setDays((e as CustomEvent).detail as DayRange) }
    window.addEventListener("setChartPeriod", handler)
    return () => window.removeEventListener("setChartPeriod", handler)
  }, [])

  async function handleBarClick(entry: { date: string }) {
    setActiveDate(entry.date)
    setSheetOpen(true)
    setLoading(true)
    try {
      const res = await fetch(`/api/day?username=${encodeURIComponent(username)}&date=${entry.date}`)
      const json = await res.json()
      setDayTracks(json.tracks ?? [])
    } finally {
      setLoading(false)
    }
  }

  if (!scrobbles.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Scrobbles</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No scrobble data yet.</p></CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Scrobbles</CardTitle>
          <div className="flex gap-1">
            {([30, 180, 360] as DayRange[]).map((d) => (
              <Button
                key={d}
                variant={days === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={xAxisInterval(days)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(_, payload) => {
                const date = payload?.[0]?.payload?.date
                if (!date) return ""
                const d = new Date(date)
                const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
                return date + " (" + days[d.getDay()] + ")"
              }} />
              <Bar
                dataKey="count"
                radius={[2, 2, 0, 0]}
                cursor="pointer"
                onClick={(data) => handleBarClick(data as unknown as { date: string })}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.date}
                    fill="var(--primary)"
                    fillOpacity={entry.date === activeDate ? 0.7 : 1}
                  />
                ))}
              </Bar>
              {days > 30 && (() => {
                const weekBoundaries = data.filter((_,i) => i > 0 && i % 7 === 0).map(d => d.label)
                return weekBoundaries.map(label => React.createElement(ReferenceLine, {key:label, x:label, stroke:"var(--border)", strokeDasharray:"3 3"}))
              })()}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{activeDate}</SheetTitle>
          </SheetHeader>
          {loading ? (
            <p className="text-sm text-muted-foreground mt-4">Loading…</p>
          ) : dayTracks.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-4">No scrobbles on this day.</p>
          ) : (
            <div className="mt-4 space-y-1">
              <p className="text-xs text-muted-foreground mb-3">{dayTracks.length} scrobbles</p>
              {dayTracks.map((t, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.track}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.artist}{t.album ? ` · ${t.album}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
                    {new Date(t.scrobbledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
