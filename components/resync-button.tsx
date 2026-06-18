'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ResyncButtonProps {
  username: string
}

export function ResyncButton({ username }: ResyncButtonProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [elapsed, setElapsed] = useState(0)
  const [dots, setDots] = useState('.')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dotsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function clearIntervals() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (dotsIntervalRef.current) {
      clearInterval(dotsIntervalRef.current)
      dotsIntervalRef.current = null
    }
  }

  useEffect(() => {
    if (status === 'loading') {
      setElapsed(0)
      setDots('.')
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
      dotsIntervalRef.current = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? '.' : prev + '.'))
      }, 400)
    } else {
      clearIntervals()
    }
    return () => clearIntervals()
  }, [status])

  async function handleClick() {
    setStatus('loading')
    setErrorMessage('')
    try {
      const res = await fetch(`/api/admin/resync?username=${encodeURIComponent(username)}`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to reset sync')
      }
      setStatus('success')
      setTimeout(() => {
        setStatus('idle')
        router.refresh()
      }, 3000)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  function getButtonLabel() {
    if (status === 'loading') {
      return `Syncing${dots} ${elapsed}s`
    }
    if (status === 'success') {
      return 'Done! Full resync queued'
    }
    return 'Force full resync'
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={status === 'loading' || status === 'success'}
      >
        <RefreshCw
          className={`h-4 w-4 mr-2 ${status === 'loading' ? 'animate-spin' : ''}`}
        />
        <span
          style={
            status === 'loading'
              ? { fontVariantNumeric: 'tabular-nums' }
              : undefined
          }
        >
          {getButtonLabel()}
        </span>
      </Button>
      {status === 'error' && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}
