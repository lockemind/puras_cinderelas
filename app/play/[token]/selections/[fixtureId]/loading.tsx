export default function FixtureLoading() {
  return (
    <div className="py-4 space-y-4 animate-pulse">
      {/* Back link */}
      <div className="h-4 w-16 rounded bg-muted" />

      {/* MatchHeader skeleton */}
      <div className="rounded-xl bg-night-card border border-night-border p-4 space-y-3">
        <div className="flex items-center justify-around">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded bg-muted mx-auto" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
          <div className="h-6 w-14 rounded bg-muted" />
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded bg-muted mx-auto" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        </div>
      </div>

      {/* MascotHero skeleton */}
      <div className="rounded-xl bg-night-card border border-gold/20 p-4 flex justify-around items-end">
        <div className="w-[140px] h-[140px] rounded bg-muted" />
        <div className="h-4 w-6 rounded bg-muted" />
        <div className="w-[140px] h-[140px] rounded bg-muted" />
      </div>
    </div>
  )
}
