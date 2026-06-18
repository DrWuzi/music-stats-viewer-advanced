'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

type ChartPeriod = 30 | 180 | 360

interface ChartPeriodContextValue {
  period: ChartPeriod
  setPeriod: (period: ChartPeriod) => void
}

const STORAGE_KEY = 'chartPeriod'
const CUSTOM_EVENT = 'setChartPeriod'

const ChartPeriodContext = createContext<ChartPeriodContextValue>({
  period: 30,
  setPeriod: () => undefined,
})

function readStoredPeriod(): ChartPeriod {
  if (typeof window === 'undefined') return 30
  const raw = window.localStorage.getItem(STORAGE_KEY)
  const parsed = Number(raw)
  if (parsed === 30 || parsed === 180 || parsed === 360) return parsed
  return 30
}

export function ChartPeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriodState] = useState<ChartPeriod>(30)

  // Read from localStorage after mount
  useEffect(() => {
    setPeriodState(readStoredPeriod())
  }, [])

  // Listen for cross-component events
  useEffect(() => {
    function handleEvent(e: Event) {
      const detail = (e as CustomEvent<ChartPeriod>).detail
      if (detail === 30 || detail === 180 || detail === 360) {
        setPeriodState(detail)
      }
    }
    window.addEventListener(CUSTOM_EVENT, handleEvent)
    return () => window.removeEventListener(CUSTOM_EVENT, handleEvent)
  }, [])

  const setPeriod = useCallback((next: ChartPeriod) => {
    setPeriodState(next)
    window.localStorage.setItem(STORAGE_KEY, String(next))
    window.dispatchEvent(new CustomEvent<ChartPeriod>(CUSTOM_EVENT, { detail: next }))
  }, [])

  return (
    <ChartPeriodContext.Provider value={{ period, setPeriod }}>
      {children}
    </ChartPeriodContext.Provider>
  )
}

export function useChartPeriod(): ChartPeriodContextValue {
  return useContext(ChartPeriodContext)
}
