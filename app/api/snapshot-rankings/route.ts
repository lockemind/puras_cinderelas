import { NextResponse } from 'next/server'
import { getRankings } from '@/actions/results'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  if (req.headers.get('x-sync-secret') !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rankings = await getRankings()
  const today = new Date().toISOString().slice(0, 10)

  const rows = rankings.map((entry, idx) => ({
    player_id: entry.player.id,
    snapshot_date: today,
    rank: idx + 1,
    points: entry.totalScore,
  }))

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('ranking_snapshots')
    .upsert(rows, { onConflict: 'player_id,snapshot_date' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ snapshotted: rows.length, snapshot_date: today })
}
