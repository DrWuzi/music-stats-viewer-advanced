'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  username: string
}

export function ExportButton({ username }: Props) {
  const handleExport = (format: 'csv' | 'json') => {
    if (format === 'json') {
      window.location.href = `/api/export/json?username=${encodeURIComponent(username)}`
    } else {
      window.location.href = `/api/export?username=${encodeURIComponent(username)}&format=csv`
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
        <Download className="h-4 w-4 mr-1" />
        Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
        <Download className="h-4 w-4 mr-1" />
        Export JSON
      </Button>
    </div>
  )
}
