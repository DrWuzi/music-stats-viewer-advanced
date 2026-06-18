'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CollapsibleSectionProps {
  id: string
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}

export function CollapsibleSection({
  id,
  title,
  defaultOpen = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const storageKey = `section_${id}`

  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return defaultOpen
    const stored = window.localStorage.getItem(storageKey)
    if (stored === null) return defaultOpen
    return stored === 'true'
  })

  // Re-read from localStorage after hydration in case SSR defaulted differently
  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey)
    if (stored !== null) {
      setOpen(stored === 'true')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle() {
    setOpen((prev) => {
      const next = !prev
      window.localStorage.setItem(storageKey, String(next))
      return next
    })
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        <Button variant="ghost" size="icon" onClick={toggle} aria-expanded={open} aria-label={open ? 'Collapse section' : 'Expand section'}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      <div style={{ display: open ? 'block' : 'none' }}>{children}</div>
    </div>
  )
}
