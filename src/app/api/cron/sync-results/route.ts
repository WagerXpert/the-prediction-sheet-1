import { NextResponse } from 'next/server'
import { syncResults } from '@/lib/cfbd/sync'
import { CURRENT_SEASON } from '@/lib/utils/constants'

// Called by Vercel Cron every hour. Vercel injects Authorization: Bearer <CRON_SECRET>.
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await syncResults(CURRENT_SEASON)
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
