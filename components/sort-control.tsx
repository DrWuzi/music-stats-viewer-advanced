'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { SortMenu, type SortOption } from '@/components/sort-menu'

interface SortControlProps {
  options: SortOption[]
  defaultValue: string
  paramKey?: string
  /** Additional search params to clear whenever the sort changes (e.g. 'page'). */
  resetParams?: string[]
  className?: string
}

/**
 * Client-side wrapper around SortMenu for Server Component pages that keep
 * sort state in the URL. Mirrors the router.replace + URLSearchParams
 * pattern already used for the period picker in components/user-profile.tsx.
 */
export function SortControl({
  options,
  defaultValue,
  paramKey = 'sort',
  resetParams = [],
  className,
}: SortControlProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get(paramKey) ?? defaultValue

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === defaultValue) {
      params.delete(paramKey)
    } else {
      params.set(paramKey, value)
    }
    for (const key of resetParams) {
      params.delete(key)
    }
    router.replace(`?${params.toString()}`)
  }

  return (
    <SortMenu value={current} onChange={handleChange} options={options} className={className} />
  )
}
