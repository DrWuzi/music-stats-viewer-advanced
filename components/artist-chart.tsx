'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MonthDatum {
  month: string
  label: string
  count: number
}

export function ArtistChart({ data, title }: { data: MonthDatum[]; title: string }) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval={Math.max(0, Math.floor(data.length / 12) - 1)}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              labelFormatter={(_, payload) => payload?.[0]?.payload?.month ?? ''}
            />
            <Bar dataKey="count" fill="var(--primary)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
