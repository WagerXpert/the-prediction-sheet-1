import { NextResponse } from 'next/server'
import { syncSchedule } from '@/lib/cfbd/sync'
import { CURRENT_SEASON } from '@/lib/utils/constants'

function isAuthorized(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  return token === process.env.ADMIN_SYNC_SECRET
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const season = body.season ?? CURRENT_SEASON
  const result = await syncSchedule(season)
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
