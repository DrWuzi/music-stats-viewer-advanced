'use client'

import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

interface LazyWidgetProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function LazyWidget({ children, fallback }: LazyWidgetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // flushSync forces React to commit the state update synchronously so the DOM
    // is updated before the browser captures the print layout snapshot.
    const handleBeforePrint = () => flushSync(() => setVisible(true))
    window.addEventListener('beforeprint', handleBeforePrint)

    const el = ref.current
    if (!el) return () => window.removeEventListener('beforeprint', handleBeforePrint)

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
    return () => {
      observer.disconnect()
      window.removeEventListener('beforeprint', handleBeforePrint)
    }
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
