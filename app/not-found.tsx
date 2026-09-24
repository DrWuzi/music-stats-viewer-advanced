'use client'

import Link from 'next/link'
import { Disc3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4 text-center">
      <Disc3
        className="animate-spin"
        style={{
          color: 'var(--muted-foreground)',
          width: 56,
          height: 56,
          animationDuration: '8s',
        }}
        aria-hidden="true"
      />

      <h1
        style={{
          fontSize: 'clamp(6rem, 20vw, 10rem)',
          fontWeight: 900,
          lineHeight: 1,
          background: 'linear-gradient(135deg, var(--chart-1), var(--chart-5))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        404
      </h1>

      <div className="flex flex-col gap-2">
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--foreground)',
          }}
        >
          Page not found
        </h2>
        <p
          style={{
            color: 'var(--muted-foreground)',
            maxWidth: '36ch',
            lineHeight: 1.6,
          }}
        >
          The artist, user, or page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>

      <Link href="/">
        <Button>Go home</Button>
      </Link>
    </div>
  )
}
