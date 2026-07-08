'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { DEFAULT_ORDER, type WidgetId } from '@/lib/dashboard-widgets'

interface DashboardCtx {
  order: WidgetId[]
  hidden: Set<WidgetId>
  isEditing: boolean
  setEditing: (v: boolean) => void
  moveUp: (id: WidgetId) => void
  moveDown: (id: WidgetId) => void
  moveTo: (fromId: WidgetId, toId: WidgetId) => void
  toggleHidden: (id: WidgetId) => void
  reset: () => void
}

const Ctx = createContext<DashboardCtx | null>(null)

interface DashboardProviderProps {
  children: ReactNode
  isOwner: boolean
  initialOrder?: WidgetId[]
  initialHidden?: WidgetId[]
}

export function DashboardProvider({ children, isOwner, initialOrder, initialHidden }: DashboardProviderProps) {
  const [order, setOrder] = useState<WidgetId[]>(initialOrder ?? DEFAULT_ORDER)
  const [hidden, setHidden] = useState<Set<WidgetId>>(new Set(initialHidden ?? []))
  const [isEditing, setIsEditing] = useState(false)

  // Debounce timer ref — avoids hammering the API on every drag step
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveToDb = useCallback((nextOrder: WidgetId[], nextHidden: Set<WidgetId>) => {
    if (!isOwner) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/dashboard-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: nextOrder, hidden: [...nextHidden] }),
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
        saveToDb(next, hidden)
        return next
      }),
    [hidden, saveToDb],
  )

  const moveDown = useCallback(
    (id: WidgetId) =>
      setOrder((prev) => {
        const i = prev.indexOf(id)
        if (i >= prev.length - 1) return prev
        const next = [...prev]
        ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
        saveToDb(next, hidden)
        return next
      }),
    [hidden, saveToDb],
  )

  const moveTo = useCallback(
    (fromId: WidgetId, toId: WidgetId) => {
      if (fromId === toId) return
      setOrder((prev) => {
        const next = prev.filter((id) => id !== fromId)
        const toIdx = next.indexOf(toId)
        next.splice(toIdx, 0, fromId)
        saveToDb(next, hidden)
        return next
      })
    },
    [hidden, saveToDb],
  )

  const toggleHidden = useCallback(
    (id: WidgetId) =>
      setHidden((prev) => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        saveToDb(order, next)
        return next
      }),
    [order, saveToDb],
  )

  const reset = useCallback(() => {
    const o = DEFAULT_ORDER
    const h = new Set<WidgetId>()
    setOrder(o)
    setHidden(h)
    saveToDb(o, h)
  }, [saveToDb])

  // Cleanup debounce on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  return (
    <Ctx.Provider value={{ order, hidden, isEditing, setEditing: setIsEditing, moveUp, moveDown, moveTo, toggleHidden, reset }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDashboard must be inside DashboardProvider')
  return ctx
}
