export default function Loading() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-6"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="flex flex-col items-center gap-3">
        <span
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          Last.fm Advanced
        </span>
        <span
          className="text-4xl animate-pulse select-none"
          style={{ color: "var(--primary)" }}
          aria-hidden="true"
        >
          ♫
        </span>
      </div>

      <div
        className="w-48 h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            backgroundColor: "var(--primary)",
            animation: "loading-bar 1.4s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
