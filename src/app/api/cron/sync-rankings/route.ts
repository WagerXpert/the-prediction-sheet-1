import { NextResponse } from 'next/server'
import { syncRankings } from '@/lib/cfbd/sync'
import { CURRENT_SEASON } from '@/lib/utils/constants'

// Called by Vercel Cron every Monday at 6 AM UTC.
// Active window: week before season opener through CFP National Championship.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  // Active window: Mon 8/25/26 (week before opener) through end of CFP title week
  const seasonStart = new Date('2026-08-25')
  const seasonEnd = new Date('2027-01-25')

  if (now < seasonStart || now > seasonEnd) {
    return NextResponse.json({ skipped: true, reason: 'Outside ranking season window' })
  }

  const result = await syncRankings(CURRENT_SEASON)
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
