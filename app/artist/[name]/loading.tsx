export default function ArtistLoading() {
  return (
    <main>
      {/* ══ HERO skeleton ══════════════════════════════════════════════════ */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: '420px' }}>
        <div className="animate-shimmer absolute inset-0" />
        {/* Bottom-up fade matching the real hero */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, var(--background) 0%, color-mix(in oklch, var(--background) 80%, transparent) 35%, color-mix(in oklch, var(--background) 20%, transparent) 60%, transparent 100%)',
          }}
        />

        <div
          className="relative container mx-auto px-4 max-w-[1400px] pt-6 pb-10 flex flex-col justify-end h-full"
          style={{ minHeight: '420px' }}
        >
          {/* Back-link placeholder */}
          <div className="animate-shimmer h-4 w-32 rounded mb-8" />

          <div className="flex flex-col md:flex-row md:items-end gap-6">
            {/* Left: name + meta */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="animate-shimmer h-3 w-14 rounded" />
              <div className="animate-shimmer h-14 w-80 max-w-full rounded-lg" />
              {/* Spotify / YouTube pill placeholders */}
              <div className="flex gap-2">
                <div className="animate-shimmer h-7 w-20 rounded-md" />
                <div className="animate-shimmer h-7 w-20 rounded-md" />
              </div>
              {/* Tag placeholders */}
              <div className="flex gap-2">
                <div className="animate-shimmer h-5 w-16 rounded-full" />
                <div className="animate-shimmer h-5 w-20 rounded-full" />
                <div className="animate-shimmer h-5 w-14 rounded-full" />
              </div>
            </div>

            {/* Right: stat tiles */}
            <div className="flex flex-wrap gap-3 md:shrink-0">
              {[120, 130, 115].map((w, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/50 bg-card/70 backdrop-blur-sm px-4 py-3"
                  style={{ minWidth: w }}
                >
                  <div className="animate-shimmer h-3 w-16 rounded mb-2" />
                  <div className="animate-shimmer h-6 w-20 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ CONTENT skeleton ═══════════════════════════════════════════════ */}
      <div className="container mx-auto px-4 max-w-[1400px] py-8 space-y-10">

        {/* Bio + sidebar row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bio */}
          <div className="md:col-span-2 rounded-xl border border-border bg-card p-5 space-y-2.5">
            <div className="animate-shimmer h-4 w-24 rounded mb-4" />
            {[100, 92, 96, 88, 94, 70].map((pct, i) => (
              <div key={i} className="animate-shimmer h-3 rounded" style={{ width: `${pct}%` }} />
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Your Stats card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="animate-shimmer h-4 w-20 rounded" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="animate-shimmer h-3 w-24 rounded" />
                  <div className="animate-shimmer h-3 w-12 rounded" />
                </div>
              ))}
            </div>

            {/* Similar Artists card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="animate-shimmer h-4 w-28 rounded" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="animate-shimmer h-9 w-9 rounded-full shrink-0" />
                  <div className="animate-shimmer h-3 flex-1 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Albums grid */}
        <section>
          <div className="animate-shimmer h-5 w-36 rounded mb-5" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i}>
                <div className="animate-shimmer aspect-square rounded-xl mb-2" />
                <div className="animate-shimmer h-3 w-4/5 rounded mb-1.5" />
                <div className="animate-shimmer h-2.5 w-1/2 rounded" />
              </div>
            ))}
          </div>
        </section>

        {/* Tracks: global + user */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((col) => (
            <div key={col} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="animate-shimmer h-4 w-36 rounded mb-2" />
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="animate-shimmer h-3 w-4 rounded" />
                  <div className="animate-shimmer h-3 flex-1 rounded" />
                  <div className="animate-shimmer h-3 w-12 rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Scrobble heatmap placeholder */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="animate-shimmer h-4 w-56 rounded mb-4" />
          <div className="animate-shimmer h-20 w-full rounded" />
          <div className="animate-shimmer h-3 w-40 rounded mt-2" />
        </div>

        {/* Play history chart placeholder */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="animate-shimmer h-4 w-48 rounded mb-4" />
          <div className="animate-shimmer h-48 w-full rounded" />
        </div>
      </div>
    </main>
  )
}
