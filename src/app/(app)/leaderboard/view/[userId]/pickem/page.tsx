import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCfbGamesByWeek, getCfbAvailableWeeks, getOpenWeek, getActualTeamRecords } from '@/lib/data/cfb'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import { getUserGamePickResults } from '@/lib/data/scores'
import { getProfileSummary } from '@/lib/data/profiles'
import GamePicksForm from '@/components/cfb/GamePicksForm'
import ViewBanner from '../../ViewBanner'
import type { GamePickResult } from '@/lib/data/scores'

export const metadata: Metadata = { title: 'Viewing CFB Pick\'em Picks' }

export default async function ViewGamePicksPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { userId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/leaderboard')

  const profile = await getProfileSummary(userId)
  if (!profile) notFound()

  const [availableWeeks, openWeek, teamRecords] = await Promise.all([
    getCfbAvailableWeeks(),
    getOpenWeek(),
    getActualTeamRecords(CURRENT_SEASON),
  ])

  const { week: weekParam } = await searchParams
  const defaultWeek = openWeek ?? availableWeeks[0] ?? 1
  const week = typeof weekParam === 'string' ? parseInt(weekParam, 10) || defaultWeek : defaultWeek

  const games = await getCfbGamesByWeek(week)

  const existing: Record<string, string> = {}
  let results: Record<string, GamePickResult> = {}

  if (games.length > 0) {
    const gameIds = games.map((g) => g.id)

    const { data: predSet } = await supabase
      .from('prediction_sets')
      .select('id')
      .eq('user_id', userId)
      .eq('sport_id', 'cfb')
      .eq('season', CURRENT_SEASON)
      .maybeSingle()

    const picksQuery = predSet
      ? supabase
          .from('predictions_game')
          .select('game_id, picked_team_id')
          .eq('prediction_set_id', predSet.id)
          .in('game_id', gameIds)
      : Promise.resolve({ data: null })

    const [picksRes, resultsData] = await Promise.all([
      picksQuery,
      getUserGamePickResults(userId, gameIds),
    ])

    for (const pick of picksRes.data ?? []) {
      existing[pick.game_id] = pick.picked_team_id
    }
    results = resultsData
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <ViewBanner displayName={profile.displayName} />

      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/leaderboard" className="hover:text-black transition-colors">Leaderboard</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">{profile.displayName}&apos;s Pick&apos;em</span>
      </div>

      <div className="mb-2">
        <h1 className="text-3xl font-black">{profile.displayName}&apos;s CFB Pick&apos;em Picks</h1>
      </div>

      {availableWeeks.length === 0 ? (
        <div className="p-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
          <p className="text-zinc-500 font-medium">No schedule has been loaded yet.</p>
        </div>
      ) : (
        <GamePicksForm
          userId={userId}
          week={week}
          weeks={availableWeeks}
          openWeek={openWeek}
          games={games}
          existing={existing}
          results={results}
          teamRecords={teamRecords}
          readOnly
          baseHref={`/leaderboard/view/${userId}/pickem`}
        />
      )}
    </div>
  )
}
