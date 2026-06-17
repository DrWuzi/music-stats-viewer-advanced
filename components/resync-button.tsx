'use client'

import { useState } from 'react'
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
        router.refresh()
      }, 1000)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={status === 'loading' || status === 'success'}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${status === 'loading' ? 'animate-spin' : ''}`} />
        {status === 'success' ? 'Sync reset! Refreshing…' : 'Force full resync'}
      </Button>
      {status === 'error' && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}
