'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, ArrowRight, Music2, HelpCircle, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { artistHref } from '@/lib/urls'

interface ListeningFriendsProps {
  username: string
  topArtists: { name: string }[]
}

export function ListeningFriends({ username, topArtists }: ListeningFriendsProps) {
  const router = useRouter()
  const [friendInput, setFriendInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const exampleArtists = topArtists.slice(0, 3)

  function handleCompare() {
    const trimmed = friendInput.trim()
    if (!trimmed) {
      setError('Please enter a Last.fm username.')
      return
    }
    setError(null)
    router.push(`/compare/${encodeURIComponent(username)}/${encodeURIComponent(trimmed)}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleCompare()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" style={{ color: 'var(--primary)' }} />
          Find Music Twins
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Compare input */}
        <div className="space-y-2">
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Enter a friend&apos;s Last.fm username to compare taste and find shared artists.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. radiohead_fan99"
              value={friendInput}
              onChange={(e) => {
                setFriendInput(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={handleKeyDown}
            />
            <Button
              onClick={handleCompare}
              disabled={!friendInput.trim()}
              className="shrink-0"
            >
              Compare
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
          {error && (
            <p className="text-xs" style={{ color: 'var(--destructive)' }}>{error}</p>
          )}
        </div>

        {/* How it works */}
        <div
          className="rounded-lg p-3 space-y-2"
          style={{
            backgroundColor: 'color-mix(in oklch, var(--muted) 60%, transparent)',
          }}
        >
          <p
            className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wide"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            How it works
          </p>
          <ol className="space-y-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            <li className="flex gap-2">
              <span className="font-semibold shrink-0" style={{ color: 'var(--foreground)' }}>1.</span>
              Enter any Last.fm username above.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold shrink-0" style={{ color: 'var(--foreground)' }}>2.</span>
              We compare your top artists and tags to find overlap.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold shrink-0" style={{ color: 'var(--foreground)' }}>3.</span>
              Get a compatibility score and shared artist highlights.
            </li>
          </ol>
        </div>

        {/* Placeholder overlap chips */}
        {exampleArtists.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
              <Music2 className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              People with similar taste also listen to
            </p>
            <div className="flex flex-wrap gap-2">
              {exampleArtists.map((artist) => (
                <span
                  key={artist.name}
                  className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border"
                  style={{
                    backgroundColor: 'color-mix(in oklch, var(--primary) 12%, transparent)',
                    borderColor: 'color-mix(in oklch, var(--primary) 30%, transparent)',
                    color: 'var(--foreground)',
                  }}
                >
                  <Link
                    href={artistHref(artist.name, username)}
                    className="hover:underline hover:text-primary transition-colors"
                  >
                    {artist.name}
                  </Link>
                </span>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Based on your top artists — real overlap appears after comparing with a friend.
            </p>
          </div>
        )}

        {/* Link to general compare page */}
        <div
          className="border-t pt-3"
          style={{ borderColor: 'var(--border)' }}
        >
          <Link
            href="/compare"
            className="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--primary)' }}
          >
            Browse all comparisons
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
