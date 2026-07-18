import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/data/full-season'
import { getCFPBracket, getConfChampGames, getCFPPicks } from '@/lib/data/cfp'
import { getProfileSummary } from '@/lib/data/profiles'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import ConfChampClient from '@/app/(app)/cfb/full-season/cfp/ConfChampClient'
import CFPBracketClient from '@/app/(app)/cfb/full-season/cfp/CFPBracketClient'
import ViewBanner from '../../../ViewBanner'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Viewing CFP Bracket' }

export default async function ViewCFPBracketPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/leaderboard')

  const profile = await getProfileSummary(userId)
  if (!profile) notFound()

  const session = await getSession(userId)
  if (!session) notFound()

  const bracket = await getCFPBracket(session.id)
  if (!bracket) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <ViewBanner displayName={profile.displayName} backHref={`/leaderboard/view/${userId}/full-season`} />
        <div className="text-center py-24">
          <div className="text-6xl mb-5">🏈</div>
          <h1 className="text-2xl font-black mb-2">Not Enough Data Yet</h1>
          <p className="text-zinc-500 mb-6 max-w-sm mx-auto">
            {profile.displayName} hasn&apos;t built a conference championship or CFP bracket yet.
          </p>
        </div>
      </div>
    )
  }

  const confChampGames = await getConfChampGames(bracket.id)
  const hasSeedings = bracket.seedings.length > 0

  if (!hasSeedings) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <ViewBanner displayName={profile.displayName} backHref={`/leaderboard/view/${userId}/full-season`} />
        <div className="mb-8">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-1">
            {CURRENT_SEASON} · Conference Championship Week
          </p>
          <h1 className="text-4xl font-black">{profile.displayName}&apos;s Conference Championships</h1>
        </div>
        <ConfChampClient bracket={bracket} confChampGames={confChampGames} readOnly />
      </div>
    )
  }

  const picks = await getCFPPicks(bracket.id)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <ViewBanner displayName={profile.displayName} backHref={`/leaderboard/view/${userId}/full-season`} />
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-1">
            {CURRENT_SEASON} · College Football Playoff
          </p>
          <h1 className="text-4xl font-black">{profile.displayName}&apos;s CFP Bracket</h1>
        </div>
      </div>
      <CFPBracketClient bracket={bracket} initialPicks={picks} sessionId={session.id} readOnly />
    </div>
  )
}
