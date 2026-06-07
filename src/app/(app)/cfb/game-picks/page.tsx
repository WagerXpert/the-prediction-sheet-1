import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCfbGamesByWeek, getCfbAvailableWeeks, getOpenWeek } from '@/lib/data/cfb'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import { getUserGamePickResults } from '@/lib/data/scores'
import GamePicksForm from '@/components/cfb/GamePicksForm'
import type { GamePickResult } from '@/lib/data/scores'

export const metadata: Metadata = { title: 'CFB Pick\'em' }

export default async function GamePicksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/cfb/game-picks')

  const [availableWeeks, openWeek] = await Promise.all([
    getCfbAvailableWeeks(),
    getOpenWeek(),
  ])

  const { week: weekParam } = await searchParams
  // Default to the open week, or the first available week, or 1
  const defaultWeek = openWeek ?? availableWeeks[0] ?? 1
  const week = typeof weekParam === 'string' ? parseInt(weekParam, 10) || defaultWeek : defaultWeek

  const games = await getCfbGamesByWeek(week)

  let existing: Record<string, string> = {}
  let results: Record<string, GamePickResult> = {}

  if (games.length > 0) {
    const gameIds = games.map((g) => g.id)

    const { data: predSet } = await supabase
      .from('prediction_sets')
      .select('id')
      .eq('user_id', user.id)
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
      getUserGamePickResults(user.id, gameIds),
    ])

    for (const pick of picksRes.data ?? []) {
      existing[pick.game_id] = pick.picked_team_id
    }
    results = resultsData
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-2 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/cfb" className="hover:text-black transition-colors">CFB Hub</Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">CFB Pick'em</span>
      </div>

      <div className="mb-2">
        <h1 className="text-3xl font-black">CFB Pick'em</h1>
        <p className="text-zinc-500 mt-1">
          Pick the winner for every game — one week at a time. The next week opens once the current week's games are complete.
        </p>
      </div>

      {/* Open week callout */}
      {openWeek !== null && (
        <div className="mb-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#84cc16]/10 border border-[#84cc16]/30">
          <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-pulse shrink-0" />
          <p className="text-sm font-semibold text-[#3f6212]">
            Week {openWeek} is now open for picks.
            {openWeek !== week && (
              <Link href={`/cfb/game-picks?week=${openWeek}`} className="ml-2 underline underline-offset-2">
                Go to Week {openWeek} →
              </Link>
            )}
          </p>
        </div>
      )}
      {openWeek === null && availableWeeks.length > 0 && (
        <div className="mb-6 mt-4 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200">
          <p className="text-sm text-zinc-500 font-medium">All weeks are complete for the {CURRENT_SEASON} season.</p>
        </div>
      )}

      {availableWeeks.length === 0 ? (
        <div className="p-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
          <p className="text-zinc-500 font-medium">No schedule has been loaded yet.</p>
          <p className="text-sm text-zinc-400 mt-1">
            An admin needs to run the schedule sync from the admin panel.
          </p>
        </div>
      ) : (
        <GamePicksForm
          userId={user.id}
          week={week}
          weeks={availableWeeks}
          openWeek={openWeek}
          games={games}
          existing={existing}
          results={results}
        />
      )}
    </div>
  )
}
