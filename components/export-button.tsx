'use client'

import { Download } from 'lucide-react'

type Props = {
  username: string
}

export function ExportButton({ username }: Props) {
  const handleExport = (format: 'csv' | 'json') => {
    window.location.href = `/api/export?username=${encodeURIComponent(username)}&format=${format}`
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleExport('csv')}
        className="inline-flex items-center gap-2 border rounded px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
      >
        <Download className="w-4 h-4" />
        Export CSV
      </button>
      <button
        onClick={() => handleExport('json')}
        className="inline-flex items-center gap-2 border rounded px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
      >
        <Download className="w-4 h-4" />
        Export JSON
      </button>
    </div>
  )
}
