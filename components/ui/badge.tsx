import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"

// HeroUI's own Badge component is an anchored notification-dot overlay — every
// placement variant in @heroui/styles/badge.css is `position: absolute` with no
// "static/inline" option, so rendering it standalone (not wrapped in
// Badge.Anchor) makes it fly out to whatever positioned ancestor it finds,
// worst case the page corner. This codebase only ever uses Badge as a plain
// inline label/chip, so we style a plain span instead, reusing the same
// HeroUI-derived color tokens bridged in globals.css for visual consistency.
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-accent/80 text-accent-foreground backdrop-blur-sm",
  secondary: "bg-default/70 text-default-foreground backdrop-blur-sm",
  destructive: "bg-danger/15 text-danger backdrop-blur-sm",
  outline: "border border-foreground/15 bg-background/30 text-foreground backdrop-blur-sm",
  ghost: "text-muted-foreground hover:bg-default/50",
  link: "text-accent underline-offset-4 hover:underline",
}

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
