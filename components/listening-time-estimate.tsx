'use client'

import { useMemo } from 'react'
import { Music } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ListeningTimeEstimateProps {
  totalScrobbles: number
}

export function ListeningTimeEstimate({ totalScrobbles }: ListeningTimeEstimateProps) {
  const { hours, days } = useMemo(() => {
    const hours = Math.round((totalScrobbles * 3.7) / 60)
    const days = Math.round(hours / 24)
    return { hours, days }
  }, [totalScrobbles])

  if (totalScrobbles === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Listening Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No scrobble data yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Listening Time
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <span className="text-4xl font-bold tracking-tight">
          ~{hours.toLocaleString('en-US')} hours
        </span>
        <span className="text-sm text-muted-foreground">
          ~{days.toLocaleString('en-US')} days of music
        </span>
      </CardContent>
    </Card>
  )
}
