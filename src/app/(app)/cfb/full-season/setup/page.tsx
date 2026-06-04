import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getOrCreateSession, getSessionConferenceIds, getAllConferencesForSetup } from '@/lib/data/full-season'
import ConferenceSetupClient from './ConferenceSetupClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Select Conferences — Full Season Mode' }

export default async function FullSeasonSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/cfb/full-season/setup')

  const [session, allConferences] = await Promise.all([
    getOrCreateSession(user.id),
    getAllConferencesForSetup(),
  ])

  if (!session) {
    return <div className="p-10 text-center text-zinc-500">Unable to create session. Please try again.</div>
  }

  const selectedIds = await getSessionConferenceIds(session.id)

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/cfb" className="hover:text-black transition-colors">CFB Hub</Link>
        <span>/</span>
        <Link href="/cfb/full-season" className="hover:text-black transition-colors">Full Season Mode</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">Select Conferences</span>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-black">Select Conferences</h1>
        <p className="text-zinc-500 mt-1">
          Choose which conferences to include in your season simulation.
        </p>
      </div>

      <ConferenceSetupClient
        sessionId={session.id}
        allConferences={allConferences}
        selectedIds={selectedIds}
      />
    </div>
  )
}
