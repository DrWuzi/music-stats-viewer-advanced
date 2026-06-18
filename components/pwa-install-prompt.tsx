'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('pwa-prompt-dismissed') === '1') return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible || !deferredPrompt) return null

  const handleInstall = async () => {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setVisible(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-prompt-dismissed', '1')
    setVisible(false)
    setDeferredPrompt(null)
  }

  return (
    <div
      role="banner"
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: '0.75rem',
        border: '1px solid var(--border)',
        background: 'var(--card)',
        color: 'var(--foreground)',
        boxShadow: '0 4px 24px color-mix(in oklch, var(--foreground) 12%, transparent)',
        maxWidth: 'calc(100vw - 2rem)',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: '0.875rem', flex: 1, whiteSpace: 'normal', lineHeight: '1.4' }}>
        Install Last.fm Advanced as an app for the best experience
      </span>
      <button
        onClick={handleInstall}
        style={{
          padding: '0.375rem 0.875rem',
          borderRadius: '0.5rem',
          border: 'none',
          background: 'var(--primary)',
          color: 'var(--primary-foreground)',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '0.375rem',
          border: 'none',
          background: 'transparent',
          color: 'var(--muted-foreground)',
          fontSize: '1.125rem',
          lineHeight: 1,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
