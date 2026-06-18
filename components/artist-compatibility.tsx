'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Artist {
  name: string
  playcount: number
}

interface ArtistCompatibilityProps {
  topArtists: Artist[]
  username: string
}

export function ArtistCompatibility({ topArtists, username }: ArtistCompatibilityProps) {
  const [friendUsername, setFriendUsername] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setScore(null)
    setFriendUsername(trimmed)

    try {
      const res = await fetch(`/api/user/${encodeURIComponent(trimmed)}/top-artists`)
      if (!res.ok) {
        setScore(0)
        setError('Could not load that user\'s top artists.')
        return
      }
      const data = await res.json()
      const friendArtists: Artist[] = Array.isArray(data) ? data : (data.artists ?? [])
      const myNames = new Set(topArtists.map((a) => a.name.toLowerCase()))
      const overlap = friendArtists.filter((a) => myNames.has(a.name.toLowerCase()))
      const total = Math.max(topArtists.length, friendArtists.length, 1)
      const computed = Math.round((overlap.length / total) * 100)
      setScore(computed)
    } catch {
      setScore(0)
      setError('Something went wrong. Showing 0% compatibility.')
    } finally {
      setLoading(false)
    }
  }

  const displayScore = score !== null ? score : 0
  const hasResult = score !== null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" style={{ color: 'var(--primary)' }} />
          Artist Compatibility
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleCompare} className="flex gap-2">
          <Input
            placeholder="Enter a friend's Last.fm username"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !inputValue.trim()}>
            {loading ? 'Comparing…' : 'Compare'}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-2 py-4">
          <div
            className="text-7xl font-bold tabular-nums"
            style={{ color: 'var(--primary)' }}
          >
            {displayScore}%
          </div>

          {hasResult && friendUsername ? (
            <p className="text-sm text-muted-foreground text-center">
              Compatibility between{' '}
              <span className="font-medium text-foreground">{username}</span> and{' '}
              <span className="font-medium text-foreground">{friendUsername}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Enter a friend's username to compare taste
            </p>
          )}

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
