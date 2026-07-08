'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { artistHref } from '@/lib/urls'

interface TasteMatchResult {
  score: number
  matchingArtists: string[]
  artistName: string
  totalSimilar: number
}

interface TasteCompatibilityProps {
  username: string
}

function getBadgeStyle(score: number): React.CSSProperties {
  if (score > 70) {
    return {
      backgroundColor: 'color-mix(in oklch, #22c55e 20%, transparent)',
      color: '#16a34a',
      borderColor: '#bbf7d0',
    }
  }
  if (score >= 40) {
    return {
      backgroundColor: 'color-mix(in oklch, #f59e0b 20%, transparent)',
      color: '#b45309',
      borderColor: '#fde68a',
    }
  }
  return {
    backgroundColor: 'color-mix(in oklch, var(--destructive) 20%, transparent)',
    color: 'var(--destructive)',
    borderColor: 'color-mix(in oklch, var(--destructive) 40%, transparent)',
  }
}

export function TasteCompatibility({ username }: TasteCompatibilityProps) {
  const [artistInput, setArtistInput] = useState('')
  const [result, setResult] = useState<TasteMatchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheck() {
    const trimmed = artistInput.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(
        `/api/taste-match?username=${encodeURIComponent(username)}&artist=${encodeURIComponent(trimmed)}`
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
      } else {
        setResult(data as TasteMatchResult)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Artist Match</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter an artist name…"
            value={artistInput}
            onChange={(e) => setArtistInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCheck() }}
            disabled={loading}
          />
          <Button onClick={handleCheck} disabled={loading || !artistInput.trim()}>
            {loading ? 'Checking…' : 'Check Match'}
          </Button>
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--destructive)' }}>{error}</p>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span
                className="text-3xl font-bold px-4 py-2 rounded-lg border text-center min-w-[5rem]"
                style={getBadgeStyle(result.score)}
              >
                {result.score}%
              </span>
              <div>
                <p className="font-medium">Match with {result.artistName}</p>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {result.matchingArtists.length} of {result.totalSimilar} similar artists in your library
                </p>
              </div>
            </div>

            {result.matchingArtists.length > 0 && (
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Because you listen to{' '}
                {result.matchingArtists.slice(0, 5).map((a, i) => (
                  <span key={a}>
                    <Link
                      href={artistHref(a, username)}
                      className="font-medium hover:underline hover:text-primary transition-colors"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {a}
                    </Link>
                    {i < Math.min(result.matchingArtists.length, 5) - 1 ? ', ' : ''}
                  </span>
                ))}
                {result.matchingArtists.length > 5 && ` and ${result.matchingArtists.length - 5} more…`}
              </p>
            )}

            {result.matchingArtists.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                None of the artists similar to {result.artistName} appear in your top artists.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
