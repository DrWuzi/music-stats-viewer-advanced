'use client'

import { useEffect, useRef, useState } from 'react'

interface LazyWidgetProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function LazyWidget({ children, fallback }: LazyWidgetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const defaultFallback = (
    <div style={{ minHeight: '200px' }} className="animate-shimmer" />
  )

  return (
    <div ref={ref}>
      {visible ? children : (fallback ?? defaultFallback)}
    </div>
  )
}
