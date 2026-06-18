'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const TIMEZONES = [
  'UTC',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
]

const STORAGE_KEY = 'userTimezone'

export function useTimezone(): string {
  if (typeof window === 'undefined') {
    return 'UTC'
  }
  return localStorage.getItem(STORAGE_KEY) ?? Intl.DateTimeFormat().resolvedOptions().timeZone
}

interface TimezoneSelectorProps {
  onChange?: (timezone: string) => void
}

export function TimezoneSelector({ onChange }: TimezoneSelectorProps) {
  const [value, setValue] = useState<string>('UTC')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const initial = stored ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    setValue(initial)
  }, [])

  function handleChange(tz: string | null) {
    if (!tz) return
    setValue(tz)
    localStorage.setItem(STORAGE_KEY, tz)
    onChange?.(tz)
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-full max-w-xs">
        <SelectValue placeholder="Select timezone" />
      </SelectTrigger>
      <SelectContent>
        {TIMEZONES.map((tz) => (
          <SelectItem key={tz} value={tz}>
            {tz}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
