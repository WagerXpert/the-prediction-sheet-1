import { NextResponse } from 'next/server'
import { syncResults } from '@/lib/cfbd/sync'
import { sendSettledWeekResults } from '@/lib/email/notify'
import { CURRENT_SEASON } from '@/lib/utils/constants'

// Called by an external scheduler (e.g. cron-job.org) every hour.
// Same auth pattern as the other cron routes: Authorization: Bearer <CRON_SECRET>.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await syncResults(CURRENT_SEASON)

  // Once grading is done, email anyone whose week just fully settled.
  // Idempotent — safe even if this fires every hour with nothing new.
  const notifications = result.ok ? await sendSettledWeekResults() : { weeksNotified: [], sent: 0 }

  return NextResponse.json({ ...result, notifications }, { status: result.ok ? 200 : 500 })
}
