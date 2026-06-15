export default function SelectionsLoading() {
  return (
    <div className="py-4 space-y-5 animate-pulse">
      {/* NextMatchHero skeleton */}
      <div className="rounded-2xl bg-night-card border border-gold/20 p-5 space-y-4">
        <div className="flex items-center justify-around">
          <div className="w-16 h-16 rounded-full bg-muted" />
          <div className="h-4 w-8 rounded bg-muted" />
          <div className="w-16 h-16 rounded-full bg-muted" />
        </div>
        <div className="h-3 w-32 rounded bg-muted mx-auto" />
      </div>

      {/* Section label */}
      <div className="h-3 w-36 rounded bg-muted" />

      {/* Fixture rows */}
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 rounded-xl border border-night-border px-3.5 py-2.5"
        >
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="h-4 flex-1 rounded bg-muted" />
          <div className="h-3 w-12 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
