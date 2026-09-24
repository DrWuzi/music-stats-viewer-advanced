"use client"

import { Drawer as HeroDrawer } from "@heroui/react"

import { cn } from "@/lib/utils"

function Sheet({
  open,
  onOpenChange,
  ...props
}: Omit<React.ComponentProps<typeof HeroDrawer>, "isOpen"> & { open?: boolean }) {
  return <HeroDrawer data-slot="sheet" isOpen={open} onOpenChange={onOpenChange} {...props} />
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: Omit<React.ComponentProps<typeof HeroDrawer.Content>, "children"> & {
  side?: "top" | "right" | "bottom" | "left"
  children?: React.ReactNode
}) {
  return (
    <HeroDrawer.Backdrop>
      <HeroDrawer.Content
        data-slot="sheet-content"
        placement={side}
        className={cn("border-foreground/10 bg-popover/80 shadow-2xl backdrop-blur-xl", className)}
        {...props}
      >
        <HeroDrawer.Dialog className="flex h-full flex-col gap-4 text-sm">
          <HeroDrawer.CloseTrigger className="absolute top-3 right-3" />
          {children}
        </HeroDrawer.Dialog>
      </HeroDrawer.Content>
    </HeroDrawer.Backdrop>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<typeof HeroDrawer.Header>) {
  return (
    <HeroDrawer.Header data-slot="sheet-header" className={cn("flex flex-col gap-0.5 p-4", className)} {...props} />
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof HeroDrawer.Heading>) {
  return (
    <HeroDrawer.Heading
      data-slot="sheet-title"
      className={cn("font-heading text-base font-medium text-foreground", className)}
      {...props}
    />
  )
}

export { Sheet, SheetContent, SheetHeader, SheetTitle }
