"use client"

import { Tabs as HeroTabs, type TabsProps as HeroTabsProps } from "@heroui/react"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  value,
  onValueChange,
  ...props
}: Omit<HeroTabsProps, "selectedKey" | "onSelectionChange"> & {
  value?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <HeroTabs
      data-slot="tabs"
      orientation="horizontal"
      selectedKey={value}
      onSelectionChange={(key) => onValueChange?.(String(key))}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: React.ComponentProps<typeof HeroTabs.List>) {
  return (
    <HeroTabs.ListContainer>
      <HeroTabs.List data-slot="tabs-list" className={cn("w-fit", className)} {...props} />
    </HeroTabs.ListContainer>
  )
}

function TabsTrigger({
  value,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof HeroTabs.Tab>, "id" | "children"> & {
  value: string
  children?: React.ReactNode
}) {
  return (
    <HeroTabs.Tab data-slot="tabs-trigger" id={value} className={cn("gap-1.5", className)} {...props}>
      {children}
      <HeroTabs.Indicator />
    </HeroTabs.Tab>
  )
}

function TabsContent({
  value,
  className,
  ...props
}: Omit<React.ComponentProps<typeof HeroTabs.Panel>, "id"> & { value: string }) {
  return (
    <HeroTabs.Panel
      data-slot="tabs-content"
      id={value}
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
