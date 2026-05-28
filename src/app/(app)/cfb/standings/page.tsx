import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCfbConferencesWithTeams } from '@/lib/data/cfb'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import StandingsForm from '@/components/cfb/StandingsForm'

export const metadata: Metadata = { title: 'Conference Standings Predictions' }

export default async function StandingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/cfb/standings')

  const conferences = await getCfbConferencesWithTeams()

  const { data: predSet } = await supabase
    .from('prediction_sets')
    .select('id')
    .eq('user_id', user.id)
    .eq('sport_id', 'cfb')
    .eq('season', CURRENT_SEASON)
    .maybeSingle()

  let existingStandings: { conference_id: string; team_id: string; predicted_rank: number }[] = []

  if (predSet) {
    const { data } = await supabase
      .from('predictions_standings')
      .select('conference_id, team_id, predicted_rank')
      .eq('prediction_set_id', predSet.id)
      .order('predicted_rank')
    existingStandings = data ?? []
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/cfb" className="hover:text-black transition-colors">
          CFB Hub
        </Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">Conference Standings</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-black">Conference Standings Predictions</h1>
        <p className="text-zinc-500 mt-1">
          Rank every team in their conference from 1st to last for the {CURRENT_SEASON} season.
        </p>
      </div>

      {conferences.length === 0 ? (
        <div className="p-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
          <p className="text-zinc-500 font-medium">Team data hasn't been loaded yet.</p>
          <p className="text-sm text-zinc-400 mt-1">
            Run <code className="bg-zinc-100 px-1 rounded">supabase/seed.sql</code> in the Supabase SQL Editor.
          </p>
        </div>
      ) : (
        <StandingsForm
          userId={user.id}
          conferences={conferences}
          existingStandings={existingStandings}
        />
      )}
    </div>
  )
}
