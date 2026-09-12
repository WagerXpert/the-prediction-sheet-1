import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { syncResults, getCurrentSyncWeek } from '@/lib/cfbd/sync'
import { sendSettledWeekResults } from '@/lib/email/notify'
import { CURRENT_SEASON } from '@/lib/utils/constants'

export const maxDuration = 60

// Called by an external scheduler (e.g. GitHub Actions) every hour.
// Same auth pattern as the other cron routes: Authorization: Bearer <CRON_SECRET>.
// Scoped to just the current open week — syncing/re-grading the whole season
// every hour was blowing past Vercel's function time limit.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  const week = await getCurrentSyncWeek(db, CURRENT_SEASON)
  if (week === null) {
    return NextResponse.json({ ok: true, records: 0, detail: 'No open week to sync', notifications: { weeksNotified: [], sent: 0 } })
  }

  const result = await syncResults(CURRENT_SEASON, week)

  // Once grading is done, email anyone whose week just fully settled.
  // Idempotent — safe even if this fires every hour with nothing new.
  // Wrapped: an email/notification failure shouldn't turn an otherwise-successful
  // sync into an opaque crashed request (see sync_log for the actual sync outcome).
  let notifications: Awaited<ReturnType<typeof sendSettledWeekResults>> | { weeksNotified: number[]; sent: number; error: string }
  try {
    notifications = result.ok ? await sendSettledWeekResults() : { weeksNotified: [], sent: 0 }
  } catch (err: any) {
    console.error('[cron/sync-results] sendSettledWeekResults failed:', err)
    notifications = { weeksNotified: [], sent: 0, error: String(err?.message ?? err) }
  }

  return NextResponse.json({ ...result, notifications }, { status: result.ok ? 200 : 500 })
}
