import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCfbConferenceById } from '@/lib/data/cfb'
import { CURRENT_SEASON } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'Pick a Team' }

export default async function ConferenceTeamsPage({
  params,
}: {
  params: Promise<{ conferenceId: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/cfb/season-records')

  const { conferenceId } = await params
  const conference = await getCfbConferenceById(conferenceId)

  if (!conference) redirect('/cfb/season-records')

  // Fetch existing predicted win counts for this user across all teams in this conference
  const { data: predSet } = await supabase
    .from('prediction_sets')
    .select('id')
    .eq('user_id', user.id)
    .eq('sport_id', 'cfb')
    .eq('season', CURRENT_SEASON)
    .maybeSingle()

  const existingMap: Record<string, { wins: number; losses: number }> = {}
  if (predSet && conference.teams.length > 0) {
    const { data } = await supabase
      .from('predictions_record')
      .select('team_id, predicted_wins, predicted_losses')
      .eq('prediction_set_id', predSet.id)
      .in('team_id', conference.teams.map((t) => t.id))
    for (const row of data ?? []) {
      existingMap[row.team_id] = { wins: row.predicted_wins, losses: row.predicted_losses }
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/cfb" className="hover:text-black transition-colors">CFB Hub</Link>
        <span>/</span>
        <Link href="/cfb/season-records" className="hover:text-black transition-colors">Season Records</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{conference.name}</span>
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-black">{conference.name}</h1>
        <p className="text-zinc-500 mt-1">Select a team to predict their game-by-game record.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {conference.teams.map((team) => {
          const existing = existingMap[team.id]
          const predicted = existing !== undefined

          return (
            <Link
              key={team.id}
              href={`/cfb/season-records/${conferenceId}/${team.id}`}
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl border border-zinc-200 hover:border-[#84cc16] hover:shadow-md transition-all bg-white text-center relative"
            >
              <div className="w-16 h-16 flex items-center justify-center">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="w-14 h-14 object-contain"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center">
                    <span className="text-xs font-black text-zinc-500">
                      {team.abbreviation ?? team.name.slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <p className="font-bold text-sm leading-tight">{team.name}</p>
                {predicted ? (
                  <p className="text-xs font-semibold text-[#65a30d] mt-0.5">
                    {existing.wins}-{existing.losses} predicted
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 mt-0.5">Not predicted</p>
                )}
              </div>

              {predicted && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#84cc16]" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
