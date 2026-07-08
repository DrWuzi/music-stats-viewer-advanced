'use client'

import { useState, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, GripVertical, Eye, EyeOff, Columns2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/components/dashboard-provider'
import { WIDGET_LABELS, type WidgetId } from '@/lib/dashboard-widgets'

interface Props {
  id: WidgetId
  children: ReactNode
}

export function DashboardWidget({ id, children }: Props) {
  const { order, hidden, sizes, isEditing, moveUp, moveDown, moveTo, toggleHidden, toggleSize } = useDashboard()
  const [isDragOver, setIsDragOver] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const isHidden = hidden.has(id)
  const widgetSize = sizes[id] ?? 2

  // Determine position for arrow disable state
  const visibleOrder = order.filter((wid) => !hidden.has(wid))
  const visIdx = visibleOrder.indexOf(id)
  const isFirst = visIdx === 0
  const isLast = visIdx === visibleOrder.length - 1

  // When not editing, hidden widgets are completely absent
  if (isHidden && !isEditing) return null

  return (
    <div
      draggable={isEditing}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', id)
        e.dataTransfer.effectAllowed = 'move'
        setIsDragging(true)
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => {
        if (!isEditing) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        const fromId = e.dataTransfer.getData('text/plain') as WidgetId
        moveTo(fromId, id)
        setIsDragOver(false)
      }}
      className={[
        'relative transition-opacity min-w-0',
        widgetSize === 1 ? 'lg:col-span-1' : 'lg:col-span-2',
        isDragging ? 'opacity-40' : '',
        isDragOver && isEditing ? 'ring-2 ring-primary ring-offset-2 rounded-xl' : '',
      ].join(' ')}
    >
      {isEditing && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-0.5 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-1 py-0.5 shadow-md">
          {/* Drag handle */}
          <span
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
            title="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>

          {/* Label */}
          <span className="text-xs text-muted-foreground px-1 select-none hidden sm:inline">
            {WIDGET_LABELS[id]}
          </span>

          {/* Up */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => moveUp(id)}
            disabled={isFirst || isHidden}
            title="Move up"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>

          {/* Down */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => moveDown(id)}
            disabled={isLast || isHidden}
            title="Move down"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>

          {/* Show / hide */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => toggleSize(id)}
            title={widgetSize === 2 ? 'Make half width' : 'Make full width'}
          >
            <Columns2 className="h-3.5 w-3.5" />
          </Button>

          {/* Show / hide */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => toggleHidden(id)}
            title={isHidden ? 'Show section' : 'Hide section'}
          >
            {isHidden ? (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}

      {/* Dim hidden widgets so the user can see their position */}
      <div className={isHidden && isEditing ? 'opacity-30 pointer-events-none select-none' : ''}>
        {children}
      </div>
    </div>
  )
}
