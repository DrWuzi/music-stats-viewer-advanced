'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function NavProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)
  const prevPathname = useRef(pathname)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (pathname === prevPathname.current) return
    prevPathname.current = pathname

    // Clear any pending timers
    if (timerRef.current) clearTimeout(timerRef.current)

    // Start progress bar
    setWidth(0)
    setVisible(true)

    // Animate to full width
    const raf = requestAnimationFrame(() => {
      setWidth(100)
    })

    // Fade out after animation completes
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setWidth(0)
    }, 450)

    return () => {
      cancelAnimationFrame(raf)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: 'var(--primary)',
          transition: 'width 300ms ease-in-out, opacity 150ms ease-in-out',
          opacity: width === 100 ? 0 : 1,
        }}
      />
    </div>
  )
}
