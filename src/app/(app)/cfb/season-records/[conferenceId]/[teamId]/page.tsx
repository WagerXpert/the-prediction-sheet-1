import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCfbTeamById, getCfbTeamSchedule, getCfbConferenceById } from '@/lib/data/cfb'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import SchedulePicksForm from '@/components/cfb/SchedulePicksForm'

export const metadata: Metadata = { title: 'Predict Schedule' }

export default async function TeamSchedulePage({
  params,
}: {
  params: Promise<{ conferenceId: string; teamId: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/cfb/season-records')

  const { conferenceId, teamId } = await params

  const [team, conference, games] = await Promise.all([
    getCfbTeamById(teamId),
    getCfbConferenceById(conferenceId),
    getCfbTeamSchedule(teamId),
  ])

  if (!team || !conference) redirect('/cfb/season-records')

  // Fetch saved predicted wins for this team
  let savedWins: number | null = null
  const { data: predSet } = await supabase
    .from('prediction_sets')
    .select('id')
    .eq('user_id', user.id)
    .eq('sport_id', 'cfb')
    .eq('season', CURRENT_SEASON)
    .maybeSingle()

  if (predSet) {
    const { data } = await supabase
      .from('predictions_record')
      .select('predicted_wins')
      .eq('prediction_set_id', predSet.id)
      .eq('team_id', teamId)
      .maybeSingle()
    savedWins = data?.predicted_wins ?? null
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400 flex-wrap">
        <Link href="/cfb" className="hover:text-black transition-colors">CFB Hub</Link>
        <span>/</span>
        <Link href="/cfb/season-records" className="hover:text-black transition-colors">Season Records</Link>
        <span>/</span>
        <Link href={`/cfb/season-records/${conferenceId}`} className="hover:text-black transition-colors">
          {conference.name}
        </Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{team.name}</span>
      </div>

      {/* Team header */}
      <div className="flex items-center gap-4 mb-8 mt-6">
        {team.logo_url ? (
          <img src={team.logo_url} alt={team.name} className="w-16 h-16 object-contain" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center">
            <span className="text-sm font-black text-zinc-500">
              {team.abbreviation ?? team.name.slice(0, 3).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <h1 className="text-3xl font-black leading-tight">{team.name}</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{CURRENT_SEASON} Season — Pick W or L for each game</p>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="p-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
          <p className="text-zinc-600 font-semibold">Schedule not loaded yet.</p>
          <p className="text-sm text-zinc-400 mt-1">
            An admin needs to run the Schedule sync from the admin panel.
          </p>
        </div>
      ) : (
        <SchedulePicksForm
          userId={user.id}
          teamId={teamId}
          team={team}
          games={games}
          savedWins={savedWins}
        />
      )}
    </div>
  )
}
