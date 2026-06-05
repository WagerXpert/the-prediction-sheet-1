import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/data/full-season'
import { initCFPSession, computeAndSaveBracketSeedings, getCFPPicks } from '@/lib/data/cfp'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import ConfChampClient from './ConfChampClient'
import CFPBracketClient from './CFPBracketClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'CFP Bracket — Full Season Mode' }

export default async function CFPBracketPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/cfb/full-season/cfp')

  const session = await getSession(user.id)
  if (!session) redirect('/cfb/full-season/setup')

  // Initialize CFP session: get/create bracket + conf champ games
  let bracketData
  try {
    bracketData = await initCFPSession(session.id)
  } catch {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Breadcrumb />
        <div className="text-center py-24">
          <div className="text-6xl mb-5">🏈</div>
          <h1 className="text-2xl font-black mb-2">Not Enough Data Yet</h1>
          <p className="text-zinc-500 mb-6 max-w-sm mx-auto">
            Predict at least a few team schedules to generate conference championships and the CFP bracket.
          </p>
          <Link href="/cfb/full-season" className="inline-block bg-[#84cc16] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#65a30d] transition-colors">
            Back to Season Predictions
          </Link>
        </div>
      </div>
    )
  }

  const { bracket, confChampGames } = bracketData

  // Check if all conf champ games have picks
  const allConfChampsPicked = confChampGames.length > 0 && confChampGames.every(g => g.winner_team_id !== null)

  // If conf champs not done: show Conference Championship Week
  if (!allConfChampsPicked) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Breadcrumb />
        <div className="mb-8">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-1">
            {CURRENT_SEASON} · Conference Championship Week
          </p>
          <h1 className="text-4xl font-black">Conference Championships</h1>
          <p className="text-zinc-500 mt-1">
            Pick every conference championship game. Conference champions determine automatic CFP bids.
          </p>
        </div>
        <ConfChampClient bracket={bracket} confChampGames={confChampGames} />
      </div>
    )
  }

  // All conf champs picked — generate seedings if needed
  let finalBracket = bracket
  if (!(bracket.seedings as any[]).length) {
    try {
      finalBracket = await computeAndSaveBracketSeedings(session.id)
    } catch {
      return (
        <div className="max-w-5xl mx-auto px-6 py-10">
          <Breadcrumb />
          <div className="text-center py-24">
            <div className="text-6xl mb-5">🏈</div>
            <h1 className="text-2xl font-black mb-2">Could Not Generate Rankings</h1>
            <p className="text-zinc-500 mb-6 max-w-sm mx-auto">
              There may not be enough prediction data. Try adding more conferences to Full Season Mode.
            </p>
            <Link href="/cfb/full-season" className="inline-block bg-[#84cc16] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#65a30d] transition-colors">
              Back to Season Predictions
            </Link>
          </div>
        </div>
      )
    }
  }

  const picks = await getCFPPicks(finalBracket.id)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Breadcrumb />
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-1">
            {CURRENT_SEASON} · College Football Playoff
          </p>
          <h1 className="text-4xl font-black">CFP Bracket</h1>
          <p className="text-zinc-500 mt-1">
            Generated from your season and conference championship predictions.
            {finalBracket.is_customized && <span className="text-[#65a30d] font-medium"> Customized.</span>}
          </p>
        </div>
      </div>
      <CFPBracketClient bracket={finalBracket} initialPicks={picks} sessionId={session.id} />
    </div>
  )
}

function Breadcrumb() {
  return (
    <div className="mb-4 flex items-center gap-2 text-sm text-zinc-400">
      <Link href="/cfb" className="hover:text-black transition-colors">CFB Hub</Link>
      <span>/</span>
      <Link href="/cfb/full-season" className="hover:text-black transition-colors">Full Season Mode</Link>
      <span>/</span>
      <span className="text-zinc-700 font-medium">CFP Bracket</span>
    </div>
  )
}
