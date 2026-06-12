import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getTeamTrackerSchedule } from '@/lib/data/team-tracker'
import { getActualTeamRecords } from '@/lib/data/cfb'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import TeamTrackerClient from './TeamTrackerClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Team Season Tracker' }

export default async function TeamTrackerTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/cfb/team-tracker/${teamId}`)

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, abbreviation, mascot, logo_url, color')
    .eq('id', teamId)
    .single()

  if (!team) notFound()

  const [games, teamRecords] = await Promise.all([
    getTeamTrackerSchedule(user.id, teamId, CURRENT_SEASON),
    getActualTeamRecords(CURRENT_SEASON),
  ])

  const completedGames = games.filter(g => g.actual_winner !== null)
  const correctPicks = completedGames.filter(
    g => g.user_pick !== null && g.user_pick === g.actual_winner
  ).length
  const incorrectPicks = completedGames.filter(
    g => g.user_pick !== null && g.user_pick !== g.actual_winner
  ).length

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/cfb" className="hover:text-black transition-colors">CFB Hub</Link>
        <span>/</span>
        <Link href="/cfb/team-tracker" className="hover:text-black transition-colors">Team Tracker</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{team.name}</span>
      </div>

      {/* Team header */}
      <div className="flex items-center gap-4 mb-6">
        {team.logo_url ? (
          <img src={team.logo_url} alt={team.name} className="w-16 h-16 object-contain" />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-lg"
            style={{ backgroundColor: team.color ? `#${team.color}` : '#18181b' }}
          >
            {team.abbreviation?.slice(0, 2) ?? team.name.slice(0, 2)}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-black">{team.name}</h1>
          {team.mascot && <p className="text-zinc-400 text-sm mt-0.5">{team.mascot}</p>}
          <p className="text-sm text-zinc-500 mt-1">{games.length} game{games.length !== 1 ? 's' : ''} · {CURRENT_SEASON} season</p>
        </div>
      </div>

      {/* Accuracy summary (only shown when there are completed picks) */}
      {completedGames.length > 0 && (correctPicks + incorrectPicks) > 0 && (
        <div className="rounded-2xl border border-zinc-200 p-5 mb-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black text-[#65a30d]">{correctPicks}</p>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">Correct</p>
          </div>
          <div>
            <p className="text-2xl font-black text-red-500">{incorrectPicks}</p>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">Incorrect</p>
          </div>
          <div>
            <p className="text-2xl font-black text-zinc-700">
              {correctPicks + incorrectPicks > 0
                ? `${Math.round((correctPicks / (correctPicks + incorrectPicks)) * 100)}%`
                : '—'}
            </p>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">Accuracy</p>
          </div>
        </div>
      )}

      <TeamTrackerClient
        userId={user.id}
        teamId={teamId}
        games={games}
        teamRecords={teamRecords}
        season={CURRENT_SEASON}
        backHref="/cfb/team-tracker"
      />
    </div>
  )
}
