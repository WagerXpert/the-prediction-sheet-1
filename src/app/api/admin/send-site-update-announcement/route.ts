import { NextResponse } from 'next/server'
import { sendSiteUpdateAnnouncement } from '@/lib/email/notify'

function isAuthorized(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  return token === process.env.ADMIN_SYNC_SECRET
}

// Manual one-time trigger — not on a cron. POST { testEmail? }.
// Send with testEmail first to preview, then again without it to blast everyone opted in.
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const testEmail: string | undefined = body.testEmail

  const result = await sendSiteUpdateAnnouncement(testEmail)
  return NextResponse.json(result)
}
