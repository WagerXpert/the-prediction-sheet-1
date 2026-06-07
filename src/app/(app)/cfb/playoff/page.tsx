import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getPlayoffBracket, getPlayoffPicks, getPlayoffTeamOptions } from '@/lib/data/playoff'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import PlayoffClient from './PlayoffClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'CFP Bracket — Playoff Mode' }

export default async function PlayoffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/cfb/playoff')

  const bracket = await getPlayoffBracket(user.id, CURRENT_SEASON)
  const [picks, teamOptions] = await Promise.all([
    bracket ? getPlayoffPicks(bracket.id) : Promise.resolve([]),
    bracket ? Promise.resolve([]) : getPlayoffTeamOptions(CURRENT_SEASON),
  ])

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/cfb" className="hover:text-black transition-colors">CFB Hub</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">CFP Bracket</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-1">
            {CURRENT_SEASON} Season
          </p>
          <h1 className="text-4xl font-black">CFP Bracket</h1>
          <p className="text-zinc-500 mt-1">
            {bracket
              ? 'Pick the winners through to the national championship.'
              : 'Set up your 12-team field, then predict the bracket.'}
          </p>
        </div>
      </div>

      <PlayoffClient
        initialBracket={bracket}
        initialPicks={picks}
        teamOptions={teamOptions}
      />
    </div>
  )
}
