'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Tag {
  name: string
  count: number
  url: string
}

interface TagCloudProps {
  username: string
}

function getTextSize(count: number): string {
  if (count > 50) return 'text-2xl'
  if (count > 30) return 'text-xl'
  if (count > 15) return 'text-lg'
  if (count > 5) return 'text-base'
  return 'text-sm'
}

function getOpacity(count: number, max: number): string {
  const ratio = max > 0 ? count / max : 1
  if (ratio > 0.8) return '100%'
  if (ratio > 0.6) return '80%'
  if (ratio > 0.4) return '60%'
  if (ratio > 0.2) return '45%'
  return '30%'
}

export function TagCloud({ username }: TagCloudProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!username) return

    async function fetchTags() {
      setLoading(true)
      setError(null)
      try {
        const apiKey = process.env.NEXT_PUBLIC_LASTFM_API_KEY
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.gettoptags&user=${encodeURIComponent(username)}&api_key=${apiKey}&format=json&limit=30`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const rawTags: Tag[] = data?.toptags?.tag ?? []
        setTags(rawTags.map(t => ({ ...t, count: Number(t.count) })))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tags')
      } finally {
        setLoading(false)
      }
    }

    fetchTags()
  }, [username])

  const maxCount = tags.length > 0 ? Math.max(...tags.map(t => t.count)) : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Tags</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="h-6 rounded-full animate-pulse"
                style={{
                  width: `${48 + (i % 5) * 16}px`,
                  backgroundColor: 'color-mix(in oklch, var(--muted) 60%, transparent)',
                }}
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <p style={{ color: 'var(--muted-foreground)' }} className="text-sm">
            Could not load tags.
          </p>
        )}

        {!loading && !error && tags.length === 0 && (
          <p style={{ color: 'var(--muted-foreground)' }} className="text-sm">
            No tags found.
          </p>
        )}

        {!loading && !error && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => {
              const opacity = getOpacity(tag.count, maxCount)
              return (
                <a
                  key={tag.name}
                  href={tag.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${getTextSize(tag.count)} font-medium rounded-full px-3 py-1 transition-opacity hover:opacity-100`}
                  style={{
                    backgroundColor: `color-mix(in oklch, var(--primary) 15%, transparent)`,
                    color: `color-mix(in oklch, var(--primary) ${opacity}, transparent)`,
                    border: `1px solid color-mix(in oklch, var(--primary) 25%, transparent)`,
                  }}
                  title={`${tag.name}: ${tag.count}`}
                >
                  {tag.name}
                </a>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
