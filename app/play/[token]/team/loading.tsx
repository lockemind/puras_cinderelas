export default function TeamLoading() {
  return (
    <div className="py-2 space-y-4 animate-pulse">
      {/* ScoreHero skeleton */}
      <div className="rounded-xl bg-night-card border border-night-border p-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-20 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
      </div>

      {/* TeamCard skeletons (4 pots) */}
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="rounded-xl bg-night-card border border-night-border p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-3 w-40 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
