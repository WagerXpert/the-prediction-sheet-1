import { NextResponse } from 'next/server'
import { sendPickReminders } from '@/lib/email/notify'

// Called by an external scheduler (e.g. cron-job.org) on Fridays.
// Same auth pattern as /api/cron/sync-results: Authorization: Bearer <CRON_SECRET>.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendPickReminders('friday')
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[cron/pick-reminder-final] sendPickReminders failed:', err)
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 })
  }
}
