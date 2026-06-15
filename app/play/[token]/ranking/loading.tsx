export default function RankingLoading() {
  return (
    <div className="py-4 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-28 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>

      {/* Table rows */}
      <div className="space-y-1">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg bg-night-card border border-night-border px-3 py-3"
          >
            <div className="w-5 h-5 rounded bg-muted" />
            <div className="h-4 flex-1 rounded bg-muted" />
            <div className="h-4 w-10 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
