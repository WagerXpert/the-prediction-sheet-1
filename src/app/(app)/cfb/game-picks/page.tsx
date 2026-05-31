import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCfbGamesByWeek, getCfbAvailableWeeks } from '@/lib/data/cfb'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import { getUserGamePickResults } from '@/lib/data/scores'
import GamePicksForm from '@/components/cfb/GamePicksForm'
import type { GamePickResult } from '@/lib/data/scores'

export const metadata: Metadata = { title: 'Game Picks' }

export default async function GamePicksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirectTo=/cfb/game-picks')

  const { week: weekParam } = await searchParams
  const week = typeof weekParam === 'string' ? parseInt(weekParam, 10) || 1 : 1

  const [games, availableWeeks] = await Promise.all([
    getCfbGamesByWeek(week),
    getCfbAvailableWeeks(),
  ])

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
        <Link href="/cfb" className="hover:text-black transition-colors">
          CFB Hub
        </Link>
        <span>/</span>
        <span className="text-zinc-700 font-medium">Game Picks</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-black">Game Picks</h1>
        <p className="text-zinc-500 mt-1">Pick the winner for every game, week by week.</p>
      </div>

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
          games={games}
          existing={existing}
          results={results}
        />
      )}
    </div>
  )
}
