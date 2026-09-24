"use client"

import { Select as HeroSelect, ListBox } from "@heroui/react"
import { ChevronDownIcon, CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Select({
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof HeroSelect>, "value" | "onChange"> & {
  value?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <HeroSelect
      data-slot="select"
      value={value ?? null}
      onChange={(v) => v != null && onValueChange?.(String(v))}
      {...props}
    />
  )
}

function SelectValue({
  className,
  children,
  placeholder,
  ...props
}: Omit<React.ComponentProps<typeof HeroSelect.Value>, "children"> & {
  children?: React.ReactNode
  placeholder?: string
}) {
  return (
    <HeroSelect.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    >
      {children ?? ((renderProps) => renderProps.selectedText || placeholder)}
    </HeroSelect.Value>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: Omit<React.ComponentProps<typeof HeroSelect.Trigger>, "children"> & {
  size?: "sm" | "default"
  children?: React.ReactNode
}) {
  return (
    <HeroSelect.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 text-sm",
        size === "sm" && "h-7",
        className
      )}
      {...props}
    >
      {children}
      <HeroSelect.Indicator>
        <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
      </HeroSelect.Indicator>
    </HeroSelect.Trigger>
  )
}

function SelectContent({ className, children, ...props }: React.ComponentProps<typeof HeroSelect.Popover>) {
  return (
    <HeroSelect.Popover
      data-slot="select-content"
      className={cn("min-w-36 rounded-2xl border border-foreground/10 bg-popover/80 shadow-xl backdrop-blur-xl", className)}
      {...props}
    >
      <ListBox>{children}</ListBox>
    </HeroSelect.Popover>
  )
}

function SelectItem({
  className,
  children,
  value,
  ...props
}: Omit<React.ComponentProps<typeof ListBox.Item>, "id" | "textValue" | "children"> & {
  value: string
  children?: React.ReactNode
}) {
  return (
    <ListBox.Item
      data-slot="select-item"
      id={value}
      textValue={typeof children === "string" ? children : undefined}
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none",
        className
      )}
      {...props}
    >
      {children}
      <ListBox.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <CheckIcon className="pointer-events-none size-4" />
      </ListBox.ItemIndicator>
    </ListBox.Item>
  )
}

function SelectGroup({ className, ...props }: React.ComponentProps<typeof ListBox.Section>) {
  return <ListBox.Section data-slot="select-group" className={cn("scroll-my-1 p-1", className)} {...props} />
}

function SelectLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
