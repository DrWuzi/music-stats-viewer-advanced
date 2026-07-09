'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { AlertCircle, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ArtistImage } from '@/components/artist-image'
import { artistHref } from '@/lib/urls'

interface Recommendation {
  name: string
  tag: string
  tagRank: number
}

export function YouMightLike({ username }: { username: string }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = useCallback(() => {
    if (!username) return

    setLoading(true)
    setError(null)

    fetch(`/api/you-might-like?username=${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((e) => Promise.reject(e.error ?? 'Failed to load'))
        }
        return res.json()
      })
      .then((data: { recommendations: Recommendation[] }) => {
        setRecommendations(data.recommendations ?? [])
      })
      .catch((err: unknown) => {
        setError(typeof err === 'string' ? err : 'Could not load recommendations.')
      })
      .finally(() => setLoading(false))
  }, [username])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          You Might Also Like
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <ul className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full shrink-0 bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-3.5 rounded bg-muted animate-pulse w-2/3" />
                  <div className="h-3 rounded bg-muted animate-pulse w-1/3" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex items-center gap-2" style={{ color: 'var(--muted-foreground)' }}>
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">Failed to load. Retry?</span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRecommendations}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && recommendations.length === 0 && (
          <EmptyState
            icon={Sparkles}
            title="No recommendations found."
            description="Listen to more music so we can find artists you haven't heard yet."
            size="compact"
          />
        )}

        {!loading && !error && recommendations.length > 0 && (
          <ul className="space-y-3">
            {recommendations.map((rec) => (
              <li key={rec.name} className="flex items-center gap-3 min-w-0">
                <ArtistImage name={rec.name} size="md" className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    <Link
                      href={artistHref(rec.name, username)}
                      className="hover:underline hover:text-primary transition-colors"
                    >
                      {rec.name}
                    </Link>
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {rec.tag}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
