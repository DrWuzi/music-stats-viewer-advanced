import { Input as HeroInput } from "@heroui/react"

import { cn } from "@/lib/utils"

function Input({ className, ...props }: React.ComponentProps<typeof HeroInput>) {
  return (
    <HeroInput
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-xl border border-foreground/10 bg-background/40 text-sm backdrop-blur-md transition-colors focus:bg-background/60",
        className
      )}
      {...props}
    />
  )
}

export { Input }
