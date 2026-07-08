'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { DEFAULT_ORDER, createDefaultSizes, type WidgetId, type WidgetSize } from '@/lib/dashboard-widgets'

interface DashboardCtx {
  order: WidgetId[]
  hidden: Set<WidgetId>
  sizes: Record<WidgetId, WidgetSize>
  isEditing: boolean
  setEditing: (v: boolean) => void
  moveUp: (id: WidgetId) => void
  moveDown: (id: WidgetId) => void
  moveTo: (fromId: WidgetId, toId: WidgetId) => void
  toggleHidden: (id: WidgetId) => void
  toggleSize: (id: WidgetId) => void
  reset: () => void
}

const Ctx = createContext<DashboardCtx | null>(null)

interface DashboardProviderProps {
  children: ReactNode
  isOwner: boolean
  initialOrder?: WidgetId[]
  initialHidden?: WidgetId[]
  initialSizes?: Partial<Record<WidgetId, WidgetSize>>
}

export function DashboardProvider({ children, isOwner, initialOrder, initialHidden, initialSizes }: DashboardProviderProps) {
  const [order, setOrder] = useState<WidgetId[]>(initialOrder ?? DEFAULT_ORDER)
  const [hidden, setHidden] = useState<Set<WidgetId>>(new Set(initialHidden ?? []))
  const [sizes, setSizes] = useState<Record<WidgetId, WidgetSize>>(createDefaultSizes(initialSizes))
  const [isEditing, setIsEditing] = useState(false)

  // Debounce timer ref — avoids hammering the API on every drag step
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveToDb = useCallback((nextOrder: WidgetId[], nextHidden: Set<WidgetId>, nextSizes: Record<WidgetId, WidgetSize>) => {
    if (!isOwner) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/dashboard-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: nextOrder, hidden: [...nextHidden], sizes: nextSizes }),
      }).catch(() => { /* silent — non-critical */ })
    }, 800)
  }, [isOwner])

  const moveUp = useCallback(
    (id: WidgetId) =>
      setOrder((prev) => {
        const i = prev.indexOf(id)
        if (i <= 0) return prev
        const next = [...prev]
        ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
        saveToDb(next, hidden, sizes)
        return next
      }),
    [hidden, saveToDb, sizes],
  )

  const moveDown = useCallback(
    (id: WidgetId) =>
      setOrder((prev) => {
        const i = prev.indexOf(id)
        if (i >= prev.length - 1) return prev
        const next = [...prev]
        ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
        saveToDb(next, hidden, sizes)
        return next
      }),
    [hidden, saveToDb, sizes],
  )

  const moveTo = useCallback(
    (fromId: WidgetId, toId: WidgetId) => {
      if (fromId === toId) return
      setOrder((prev) => {
        const next = prev.filter((id) => id !== fromId)
        const toIdx = next.indexOf(toId)
        next.splice(toIdx, 0, fromId)
        saveToDb(next, hidden, sizes)
        return next
      })
    },
    [hidden, saveToDb, sizes],
  )

  const toggleHidden = useCallback(
    (id: WidgetId) =>
      setHidden((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        saveToDb(order, next, sizes)
        return next
      }),
    [order, saveToDb, sizes],
  )

  const toggleSize = useCallback(
    (id: WidgetId) =>
      setSizes((prev) => {
        const next: Record<WidgetId, WidgetSize> = {
          ...prev,
          [id]: prev[id] === 2 ? 1 : 2,
        }
        saveToDb(order, hidden, next)
        return next
      }),
    [hidden, order, saveToDb],
  )

  const reset = useCallback(() => {
    const o = DEFAULT_ORDER
    const h = new Set<WidgetId>()
    const s = createDefaultSizes()
    setOrder(o)
    setHidden(h)
    setSizes(s)
    saveToDb(o, h, s)
  }, [saveToDb])

  // Cleanup debounce on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  return (
    <Ctx.Provider value={{ order, hidden, sizes, isEditing, setEditing: setIsEditing, moveUp, moveDown, moveTo, toggleHidden, toggleSize, reset }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDashboard must be inside DashboardProvider')
  return ctx
}
