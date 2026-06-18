'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
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

const ORDER_KEY = 'dashboardOrder_v1'
const HIDDEN_KEY = 'dashboardHidden_v1'

function readOrder(): WidgetId[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY)
    if (!raw) return DEFAULT_ORDER
    const parsed = JSON.parse(raw) as WidgetId[]
    const valid = parsed.filter((id) => (DEFAULT_ORDER as readonly string[]).includes(id))
    const added = DEFAULT_ORDER.filter((id) => !valid.includes(id))
    return [...valid, ...added]
  } catch {
    return DEFAULT_ORDER
  }
}

function readHidden(): Set<WidgetId> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY)
    return raw ? new Set(JSON.parse(raw) as WidgetId[]) : new Set()
  } catch {
    return new Set()
  }
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<WidgetId[]>(DEFAULT_ORDER)
  const [hidden, setHidden] = useState<Set<WidgetId>>(new Set())
  const [isEditing, setIsEditing] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setOrder(readOrder())
    setHidden(readHidden())
    setReady(true)
  }, [])

  const persist = useCallback((nextOrder: WidgetId[], nextHidden: Set<WidgetId>) => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(nextOrder))
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...nextHidden]))
  }, [])

  const moveUp = useCallback(
    (id: WidgetId) =>
      setOrder((prev) => {
        const i = prev.indexOf(id)
        if (i <= 0) return prev
        const next = [...prev]
        ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
        persist(next, hidden)
        return next
      }),
    [hidden, persist],
  )

  const moveDown = useCallback(
    (id: WidgetId) =>
      setOrder((prev) => {
        const i = prev.indexOf(id)
        if (i >= prev.length - 1) return prev
        const next = [...prev]
        ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
        persist(next, hidden)
        return next
      }),
    [hidden, persist],
  )

  const moveTo = useCallback(
    (fromId: WidgetId, toId: WidgetId) => {
      if (fromId === toId) return
      setOrder((prev) => {
        const next = prev.filter((id) => id !== fromId)
        const toIdx = next.indexOf(toId)
        next.splice(toIdx, 0, fromId)
        persist(next, hidden)
        return next
      })
    },
    [hidden, persist],
  )

  const toggleHidden = useCallback(
    (id: WidgetId) =>
      setHidden((prev) => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        persist(order, next)
        return next
      }),
    [order, persist],
  )

  const reset = useCallback(() => {
    const o = DEFAULT_ORDER
    const h = new Set<WidgetId>()
    setOrder(o)
    setHidden(h)
    persist(o, h)
  }, [persist])

  // Avoid hydration mismatch by rendering children without context until client hydrates
  if (!ready) {
    return <>{children}</>
  }

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
