'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4 text-center">
      <AlertCircle
        style={{ color: 'var(--destructive)', width: 48, height: 48 }}
        aria-hidden="true"
      />

      <div className="flex flex-col gap-2">
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--foreground)',
          }}
        >
          Something went wrong
        </h2>
        <p
          style={{
            color: 'var(--muted-foreground)',
            maxWidth: '40ch',
            lineHeight: 1.6,
          }}
        >
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
      </div>

      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
