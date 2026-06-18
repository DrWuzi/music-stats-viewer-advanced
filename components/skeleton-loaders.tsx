import { Card } from "@/components/ui/card";

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="animate-shimmer rounded bg-muted h-5 w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="animate-shimmer rounded bg-muted h-4"
            style={{ width: i === lines - 1 ? "60%" : "100%" }}
          />
        ))}
      </div>
    </Card>
  );
}

const avatarSizes = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
} as const;

export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div
      className={`animate-shimmer rounded-full bg-muted ${avatarSizes[size]}`}
    />
  );
}

const textWidths = {
  full: "w-full",
  half: "w-1/2",
  quarter: "w-1/4",
} as const;

export function SkeletonText({
  width = "full",
}: {
  width?: "full" | "half" | "quarter";
}) {
  return (
    <div className={`animate-shimmer rounded bg-muted h-4 ${textWidths[width]}`} />
  );
}
