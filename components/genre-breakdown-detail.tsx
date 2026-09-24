'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface GenreTag {
  tag: string
  score: number
  artistCount: number
}

// Fixed (not Math.random()) so the SSR pass and the client hydration pass
// render identical widths — random values differ between the two, which
// throws a hydration mismatch.
const SKELETON_BAR_WIDTHS = [88, 72, 95, 65, 80, 70, 92, 61]

interface GenreBreakdownDetailProps {
  username: string
}

export function GenreBreakdownDetail({ username }: GenreBreakdownDetailProps) {
  const router = useRouter()
  const [tags, setTags] = useState<GenreTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!username) return

    setLoading(true)
    setError(null)

    fetch(`/api/genre?username=${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setTags(data.tags ?? [])
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [username])

  const maxScore = tags.length > 0 ? tags[0].score : 1

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Genre Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SKELETON_BAR_WIDTHS.map((width, i) => (
              <div key={i} className="space-y-1">
                <div
                  className="h-3 rounded"
                  style={{ width: `${width}%`, background: 'var(--muted)' }}
                />
                <div className="h-4 rounded" style={{ width: '70%', background: 'var(--muted)' }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Genre Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Failed to load genre data.</p>
        </CardContent>
      </Card>
    )
  }

  if (tags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Genre Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Tag} title="No data available." size="compact" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Genre Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          Weighted by artist rank · click a genre to explore
        </p>
        <div className="space-y-3">
          {tags.map(({ tag, score, artistCount }) => {
            const pct = (score / maxScore) * 100

            return (
              <button
                key={tag}
                className="w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                style={{ '--ring-color': 'var(--primary)' } as React.CSSProperties}
                onClick={() =>
                  router.push(
                    `/genre/${encodeURIComponent(tag)}?user=${encodeURIComponent(username)}`
                  )
                }
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {tag}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {artistCount} {artistCount === 1 ? 'artist' : 'artists'}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--muted)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300 group-hover:opacity-80"
                    style={{
                      width: `${pct}%`,
                      background: 'var(--primary)',
                    }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
