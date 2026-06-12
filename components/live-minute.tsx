'use client'

import { useEffect, useState } from 'react'

export function useTickingNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function approxMinute(utcDate: string, now: number): string {
  const elapsed = Math.round((now - new Date(utcDate).getTime()) / 60_000)
  if (elapsed <= 0) return "1'"
  if (elapsed > 90) return "90'+"
  return `${elapsed}'`
}

export function LiveMinute({ utcDate }: { utcDate: string }) {
  const now = useTickingNow()
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-destructive tabular-nums">
      <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-[pulse_1.2s_ease-in-out_infinite]" />
      <span suppressHydrationWarning>{approxMinute(utcDate, now)}</span>
    </span>
  )
}
