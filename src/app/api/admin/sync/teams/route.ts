import { NextResponse } from 'next/server'
import { syncTeams } from '@/lib/cfbd/sync'

function isAuthorized(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  return token === process.env.ADMIN_SYNC_SECRET
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await syncTeams()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
