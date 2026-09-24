'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadChartAsPng } from '@/lib/export-chart'

interface ChartExportButtonProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  filename: string
}

export function ChartExportButton({ containerRef, filename }: ChartExportButtonProps) {
  const [downloading, setDownloading] = useState(false)

  const handleClick = async () => {
    if (!containerRef.current) return
    setDownloading(true)
    await downloadChartAsPng(containerRef.current, filename)
    setDownloading(false)
  }

  return (
    <Button size="sm" variant="ghost" onClick={handleClick} disabled={downloading} aria-label="Export chart as PNG">
      {downloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </Button>
  )
}
