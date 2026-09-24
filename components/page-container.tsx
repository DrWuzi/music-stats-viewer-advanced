import { cn } from "@/lib/utils"

const MAX_WIDTHS = {
  md: "max-w-md",
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  // Respects the Settings → Display → Page width preference (mw-wide/mw-full
  // classes toggled on <html>, see app/globals.css).
  content: "max-w-[var(--content-max-width)]",
  // Wider fixed width for immersive hero-banner detail pages (artist/album/track/genre).
  hero: "max-w-[1400px]",
} as const

type PageContainerProps = React.ComponentProps<"div"> & {
  maxWidth?: keyof typeof MAX_WIDTHS
  as?: "div" | "main"
  /** Set false when an ancestor (e.g. a full-bleed <main>) already applies the page padding. */
  padding?: boolean
}

function PageContainer({
  className,
  maxWidth = "content",
  as: Component = "div",
  padding = true,
  ...props
}: PageContainerProps) {
  return (
    <Component
      className={cn("mx-auto", padding && "px-4 sm:px-6 lg:px-8", MAX_WIDTHS[maxWidth], className)}
      {...props}
    />
  )
}

export { PageContainer }
