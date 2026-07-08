'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BackButtonProps {
  href?: string
  label?: string
}

export function BackButton({ href, label = 'Back' }: BackButtonProps) {
  const router = useRouter()

  if (href) {
    return (
      <a href={href}>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2 mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" />
          {label}
        </Button>
      </a>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground -ml-2 mb-4"
      onClick={() => router.back()}
    >
      <ChevronLeft className="h-4 w-4 mr-1" />
      {label}
    </Button>
  )
}
