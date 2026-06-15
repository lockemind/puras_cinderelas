export default function FixtureLoading() {
  return (
    <div className="py-4 space-y-3.5 animate-pulse">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-14 rounded bg-muted" />
        <div className="h-3 w-24 rounded bg-muted" />
      </div>

      {/* DuelHero skeleton */}
      <div className="rounded-2xl border border-night-border bg-[linear-gradient(180deg,oklch(0.16_0.018_265),oklch(0.11_0.015_265))] px-4 pt-8 pb-5 flex items-center justify-between">
        <div className="flex flex-col items-center gap-2 w-24">
          <div className="w-[78px] h-[78px] rounded-full bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
        <div className="h-8 w-16 rounded bg-muted" />
        <div className="flex flex-col items-center gap-2 w-24">
          <div className="w-[78px] h-[78px] rounded-full bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      </div>

      {/* WinWorthBanner skeleton */}
      <div className="rounded-xl border border-gold/20 bg-gold-muted px-3.5 py-3 flex justify-center">
        <div className="h-3 w-52 rounded bg-muted" />
      </div>

      {/* OwnershipColumns skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-40 rounded bg-muted" />
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-night-card border border-night-border p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-[26px] h-[26px] rounded-full bg-muted" />
              <div className="h-3 flex-1 rounded bg-muted" />
            </div>
            <div className="h-px bg-night-border" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
          <div className="rounded-xl bg-night-card border border-night-border p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-[26px] h-[26px] rounded-full bg-muted" />
              <div className="h-3 flex-1 rounded bg-muted" />
            </div>
            <div className="h-px bg-night-border" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}
