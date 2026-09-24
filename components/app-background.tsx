// Fixed ambient backdrop for the glass/layered UI — sits behind every page so
// translucent, blurred cards/nav have something soft to show through. Pure
// decoration (aria-hidden, pointer-events-none); no client JS needed.
export function AppBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div
        className="app-blob-a absolute -top-32 -left-24 h-[32rem] w-[32rem] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle at 30% 30%, var(--chart-1), transparent 70%)" }}
      />
      <div
        className="app-blob-b absolute -right-32 top-1/3 h-[36rem] w-[36rem] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle at 70% 40%, var(--chart-5), transparent 70%)" }}
      />
      <div
        className="app-blob-c absolute -bottom-40 left-1/4 h-[30rem] w-[30rem] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle at 50% 50%, var(--chart-3), transparent 70%)" }}
      />
    </div>
  )
}
