import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getSession,
  getTeamScheduleForSession,
  getConferenceStandingsData,
} from '@/lib/data/full-season'
import { getLatestRankings, getActualTeamRecords } from '@/lib/data/cfb'
import { cfbd } from '@/lib/cfbd/client'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import TeamScheduleClient from './TeamScheduleClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Team Schedule — Full Season Mode' }

export default async function FullSeasonTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/cfb/full-season')

  const session = await getSession(user.id)
  if (!session) redirect('/cfb/full-season/setup')

  // Fetch team info
  const { data: team } = await supabase
    .from('teams')
    .select('id, name, abbreviation, mascot, logo_url, color, conference_id, external_id')
    .eq('id', teamId)
    .single()

  if (!team) notFound()

  const [games, standingsData, rankings, prevRecords, teamRecords] = await Promise.all([
    getTeamScheduleForSession(session.id, teamId),
    team.conference_id
      ? getConferenceStandingsData(session.id, team.conference_id)
      : Promise.resolve({ teams: [], games: [], picks: {} }),
    getLatestRankings(CURRENT_SEASON),
    cfbd.records(CURRENT_SEASON - 1, team.name).catch(() => [] as Awaited<ReturnType<typeof cfbd.records>>),
    getActualTeamRecords(CURRENT_SEASON),
  ])

  const currentRank = rankings.get(teamId) ?? null
  const prevRecord = prevRecords[0]?.total ?? null

  const predicted = games.filter(g => g.winner_team_id !== null).length

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/cfb" className="hover:text-black transition-colors">CFB Hub</Link>
        <span>/</span>
        <Link href="/cfb/full-season" className="hover:text-black transition-colors">Full Season Mode</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{team.name}</span>
      </div>

      {/* Team header */}
      <div className="flex items-center gap-4 mb-8">
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black">{team.name}</h1>
            {currentRank && (
              <span className="text-sm font-black text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-lg">
                #{currentRank} AP
              </span>
            )}
          </div>
          {team.mascot && <p className="text-zinc-400 text-sm mt-0.5">{team.mascot}</p>}
          {prevRecord && (
            <p className="text-xs text-zinc-400 mt-0.5">
              {CURRENT_SEASON - 1} record: {prevRecord.wins}–{prevRecord.losses}
            </p>
          )}
          <p className="text-sm font-medium text-zinc-500 mt-1">
            {predicted} / {games.length} games predicted
            {games.length > 0 && predicted === games.length && (
              <span className="ml-2 text-[#84cc16] font-bold">✓ Complete</span>
            )}
          </p>
        </div>
      </div>

      <TeamScheduleClient
        sessionId={session.id}
        teamId={teamId}
        games={games}
        conferenceTeams={standingsData.teams}
        conferenceGames={standingsData.games}
        initialPicks={standingsData.picks}
        rankings={Object.fromEntries(rankings)}
        teamRecords={teamRecords}
        season={CURRENT_SEASON}
        backHref="/cfb/full-season"
      />
    </div>
  )
}
