'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Suggestion {
  name: string
  similarity: number
  basedOn: string
}

export function SimilarUnheard({ username }: { username: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/similar-unheard?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => {
        setSuggestions(data.suggestions ?? [])
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false))
  }, [username])

  return (
    <Card>
      <CardHeader>
        <CardTitle>You Might Like</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No suggestions found.</p>
        ) : (
          <ul className="space-y-3">
            {suggestions.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <Link
                    href={`/artist/${encodeURIComponent(s.name)}?username=${encodeURIComponent(username)}`}
                    className="text-sm font-medium hover:underline truncate"
                  >
                    {s.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    Similar to {s.basedOn}
                  </span>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {s.similarity}%
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
