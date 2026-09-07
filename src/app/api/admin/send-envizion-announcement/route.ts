import { NextResponse } from 'next/server'
import { sendEnvizionAnnouncement } from '@/lib/email/notify'

function isAuthorized(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  return token === process.env.ADMIN_SYNC_SECRET
}

// Manual one-time trigger — not on a cron. POST { ctaUrl, testEmail? }.
// Send with testEmail first to preview, then again without it to blast everyone opted in.
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const ctaUrl: string | undefined = body.ctaUrl
  const testEmail: string | undefined = body.testEmail

  if (!ctaUrl) {
    return NextResponse.json({ error: 'ctaUrl is required' }, { status: 400 })
  }

  const result = await sendEnvizionAnnouncement(ctaUrl, testEmail)
  return NextResponse.json(result)
}
