import { Card as HeroCard } from "@heroui/react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<typeof HeroCard>) {
  return (
    <HeroCard
      data-slot="card"
      className={cn(
        "gap-(--card-spacing) py-(--card-spacing) text-sm [--card-spacing:--spacing(4)] rounded-2xl border border-foreground/10 bg-card/60 backdrop-blur-xl shadow-xl shadow-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-2xl hover:shadow-black/10 animate-fade-in-up dark:shadow-black/30 dark:hover:shadow-black/40",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<typeof HeroCard.Header>) {
  return (
    <HeroCard.Header
      data-slot="card-header"
      className={cn("gap-1 px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof HeroCard.Title>) {
  return (
    <HeroCard.Title
      data-slot="card-title"
      className={cn("font-heading text-base leading-snug font-medium", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<typeof HeroCard.Description>) {
  return (
    <HeroCard.Description
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<typeof HeroCard.Content>) {
  return (
    <HeroCard.Content
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<typeof HeroCard.Footer>) {
  return (
    <HeroCard.Footer
      data-slot="card-footer"
      className={cn("flex items-center p-(--card-spacing)", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
