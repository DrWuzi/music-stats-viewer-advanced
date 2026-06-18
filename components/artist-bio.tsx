'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ArtistBio({ bio }: { bio: string }) {
  const [expanded, setExpanded] = useState(false)
  const [contentHeight, setContentHeight] = useState<number | null>(null)
  const contentRef = useRef<HTMLParagraphElement>(null)

  const COLLAPSED_HEIGHT = 96

  useLayoutEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [bio])

  const isLong = contentHeight === null ? true : contentHeight > COLLAPSED_HEIGHT
  const expandedHeight = contentHeight ?? 2000

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle>About</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div
            style={{
              maxHeight: expanded ? `${expandedHeight}px` : `${COLLAPSED_HEIGHT}px`,
              overflow: 'hidden',
              transition: 'max-height 0.4s ease',
            }}
          >
            <p
              ref={contentRef}
              className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line"
            >
              {bio}
            </p>
          </div>
          {isLong && !expanded && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '48px',
                background:
                  'linear-gradient(to bottom, color-mix(in oklch, var(--card) 0%, transparent), var(--card))',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
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
