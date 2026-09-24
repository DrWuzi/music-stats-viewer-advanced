import { Button as HeroButton, buttonVariants as heroButtonVariants } from "@heroui/react"

import { cn } from "@/lib/utils"

type HeroButtonProps = React.ComponentProps<typeof HeroButton>

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"

// Translates this codebase's existing variant/size vocabulary onto HeroUI's
// smaller vocabulary so the ~150 existing @/components/ui/button consumers
// don't need to change.
const VARIANT_MAP: Record<ButtonVariant, NonNullable<HeroButtonProps["variant"]>> = {
  default: "primary",
  outline: "outline",
  secondary: "secondary",
  ghost: "ghost",
  destructive: "danger-soft",
  link: "ghost",
}

const SIZE_MAP: Record<ButtonSize, NonNullable<HeroButtonProps["size"]>> = {
  default: "md",
  xs: "sm",
  sm: "sm",
  lg: "lg",
  icon: "md",
  "icon-xs": "sm",
  "icon-sm": "sm",
  "icon-lg": "lg",
}

const ICON_ONLY_SIZES = new Set<ButtonSize>(["icon", "icon-xs", "icon-sm", "icon-lg"])

// HeroUI has no "link" variant; approximate it on top of "ghost".
const LINK_CLASSES = "underline-offset-4 hover:underline"

// Glass-aesthetic overrides layered on top of HeroUI's own variant classes —
// these win because they're unlayered utility classes (see the HeroUI token
// bridge note in globals.css) merged in via twMerge, so later same-category
// classes replace HeroUI's defaults instead of fighting them.
const GLASS_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: "border-0 bg-gradient-to-r from-chart-1 to-chart-5 text-white shadow-lg shadow-chart-1/25 hover:shadow-xl hover:shadow-chart-1/35 hover:brightness-110",
  outline: "border-foreground/15 bg-background/40 backdrop-blur-md hover:bg-background/60",
  secondary: "border-0 bg-default/70 backdrop-blur-md hover:bg-default/90",
  ghost: "hover:bg-foreground/5",
  destructive: "",
  link: "",
}

function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) {
  return cn(
    heroButtonVariants({
      variant: VARIANT_MAP[variant],
      size: SIZE_MAP[size],
      isIconOnly: ICON_ONLY_SIZES.has(size),
    }),
    "rounded-xl transition-all duration-200",
    GLASS_VARIANT_CLASSES[variant],
    variant === "link" && LINK_CLASSES,
    className
  )
}

type ButtonProps = Omit<HeroButtonProps, "variant" | "size"> & {
  variant?: ButtonVariant
  size?: ButtonSize
  // React Aria's Button intentionally omits these two native attributes
  // (isDisabled/Tooltip are the recommended alternatives), but this
  // codebase's ~150 existing consumers rely on the native HTML API.
  disabled?: boolean
  title?: string
}

function Button({ className, variant = "default", size = "default", isIconOnly, disabled, ...props }: ButtonProps) {
  return (
    <HeroButton
      data-slot="button"
      variant={VARIANT_MAP[variant]}
      size={SIZE_MAP[size]}
      isIconOnly={isIconOnly || ICON_ONLY_SIZES.has(size)}
      isDisabled={disabled}
      className={cn(
        "rounded-xl transition-all duration-200",
        GLASS_VARIANT_CLASSES[variant],
        variant === "link" && LINK_CLASSES,
        className
      )}
      {...(props as HeroButtonProps & { title?: string })}
    />
  )
}

export { Button, buttonVariants }
