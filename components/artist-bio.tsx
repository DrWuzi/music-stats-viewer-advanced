'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ArtistBio({ bio }: { bio: string }) {
  const [expanded, setExpanded] = useState(false)
  const LIMIT = 500
  const isLong = bio.length > LIMIT
  const display = expanded || !isLong ? bio : bio.slice(0, LIMIT).trimEnd() + '…'

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle>About</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{display}</p>
        {isLong && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 px-0 h-auto text-xs hover:bg-transparent"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Show less ↑' : 'Read more ↓'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
