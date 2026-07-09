'use client'

import { useEffect, useState } from 'react'
import { Tag as TagIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'

interface Tag {
  name: string
  count: number
}

export function GenreBreakdown({ username }: { username: string }) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/genre-tags?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => setTags(data.tags ?? []))
      .catch(() => setTags([]))
      .finally(() => setLoading(false))
  }, [username])

  function fontSizeClass(index: number, total: number): string {
    if (total <= 1 || index === 0) return 'text-lg'
    const ratio = index / (total - 1)
    if (ratio < 0.33) return 'text-base'
    if (ratio < 0.66) return 'text-sm'
    return 'text-sm'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Taste Profile</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Analyzing taste…</p>
        ) : tags.length === 0 ? (
          <EmptyState icon={TagIcon} title="No genre data available." size="compact" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <Badge
                key={tag.name}
                variant="secondary"
                className={[fontSizeClass(i, tags.length), 'h-auto py-1 px-3'].join(' ')}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
