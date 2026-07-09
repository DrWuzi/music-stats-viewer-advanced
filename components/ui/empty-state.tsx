import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  size?: "default" | "compact"
  action?: { label: string; href: string }
  className?: string
}

function EmptyState({
  icon: Icon,
  title,
  description,
  size = "default",
  action,
  className,
}: EmptyStateProps) {
  const isCompact = size === "compact"

  return (
    <div
      data-slot="empty-state"
      data-size={size}
      className={cn(
        "flex flex-col items-center gap-2 text-center text-muted-foreground",
        isCompact ? "py-6" : "py-12",
        className
      )}
    >
      <Icon className={cn("opacity-40", isCompact ? "h-6 w-6" : "h-10 w-10")} />
      <p className={cn("font-medium", isCompact ? "text-xs" : "text-sm")}>{title}</p>
      {description && (
        <p className={cn("opacity-70", isCompact ? "text-xs" : "text-sm")}>
          {description}
        </p>
      )}
      {action && (
        <Link
          href={action.href}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}

export { EmptyState }
