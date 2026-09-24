"use client"

import { Avatar as HeroAvatar } from "@heroui/react"

import { cn } from "@/lib/utils"

type AvatarSize = "default" | "sm" | "lg"

const SIZE_MAP: Record<AvatarSize, "sm" | "md" | "lg"> = {
  default: "md",
  sm: "sm",
  lg: "lg",
}

function Avatar({
  className,
  size = "default",
  ...props
}: Omit<React.ComponentProps<typeof HeroAvatar>, "size"> & { size?: AvatarSize }) {
  return (
    <HeroAvatar
      data-slot="avatar"
      size={SIZE_MAP[size]}
      className={cn("shrink-0", className)}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof HeroAvatar.Image>) {
  return (
    <HeroAvatar.Image
      data-slot="avatar-image"
      className={cn("object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof HeroAvatar.Fallback>) {
  return (
    <HeroAvatar.Fallback
      data-slot="avatar-fallback"
      className={className}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
