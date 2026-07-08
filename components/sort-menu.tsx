'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface SortOption {
  value: string
  label: string
}

interface SortMenuProps {
  value: string
  onChange: (value: string) => void
  options: SortOption[]
  className?: string
}

export function SortMenu({ value, onChange, options, className }: SortMenuProps) {
  const activeLabel = options.find((o) => o.value === value)?.label ?? value

  return (
    <Select value={value} onValueChange={(v) => onChange(v as string)}>
      <SelectTrigger className={className ?? 'w-40'} size="sm">
        <SelectValue>{activeLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
