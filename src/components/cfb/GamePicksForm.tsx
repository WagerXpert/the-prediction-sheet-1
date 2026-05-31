'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { CfbGame } from '@/lib/data/cfb'
import type { GamePickResult } from '@/lib/data/scores'
import { CURRENT_SEASON } from '@/lib/utils/constants'

interface Props {
  userId: string
  week: number
  weeks: number[]
  games: CfbGame[]
  existing: Record<string, string>
  results: Record<string, GamePickResult>
}

function formatGameDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function winningTeamId(game: CfbGame): string | null {
  if (game.status !== 'completed') return null
  // CfbGame doesn't carry scores, but the `status` field tells us it's done.
  // Winning team can only be shown if scores are on the game object.
  // For now we rely solely on is_correct from the predictions_game grade.
  return null
}

export default function GamePicksForm({ userId, week, weeks, games, existing, results }: Props) {
  const [picks, setPicks] = useState<Record<string, string>>(() => ({ ...existing }))
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()

  const unpickedOpen = games.filter(
    (g) => g.status !== 'completed' && !picks[g.id]
  ).length
  const pickedCount = Object.keys(picks).length

  function handlePick(gameId: string, teamId: string) {
    setPicks((prev) => ({ ...prev, [gameId]: teamId }))
  }

  function handleSave() {
    startTransition(async () => {
      setSaveStatus('saving')
      const supabase = createClient()

      const { data: predSet, error: psError } = await supabase
        .from('prediction_sets')
        .upsert(
          { user_id: userId, sport_id: 'cfb', season: CURRENT_SEASON },
          { onConflict: 'user_id,sport_id,season' }
        )
        .select('id')
        .single()

      if (psError || !predSet) {
        setSaveStatus('error')
        return
      }

      const openPicks = games
        .filter((g) => g.status !== 'completed' && picks[g.id])
        .map((g) => ({
          prediction_set_id: predSet.id,
          user_id: userId,
          game_id: g.id,
          picked_team_id: picks[g.id],
        }))

      if (openPicks.length === 0) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
        return
      }

      const { error } = await supabase
        .from('predictions_game')
        .upsert(openPicks, { onConflict: 'prediction_set_id,game_id' })

      if (error) {
        setSaveStatus('error')
      } else {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    })
  }

  const gradedThisWeek = games.filter(
    (g) => results[g.id]?.isCorrect !== null && results[g.id]?.isCorrect !== undefined
  )
  const correctThisWeek = gradedThisWeek.filter((g) => results[g.id]?.isCorrect === true)
  const weekPoints = gradedThisWeek.reduce((s, g) => s + (results[g.id]?.pointsAwarded ?? 0), 0)

  return (
    <div>
      {/* Week tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {weeks.map((w) => (
          <Link
            key={w}
            href={`/cfb/game-picks?week=${w}`}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              w === week
                ? 'bg-black text-white border-black'
                : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
            }`}
          >
            Week {w}
          </Link>
        ))}
      </div>

      {/* Week score summary (only when graded games exist) */}
      {gradedThisWeek.length > 0 && (
        <div className="mb-6 flex items-center gap-6 px-5 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-sm">
          <div>
            <span className="text-zinc-400 font-medium">Week {week} score </span>
            <span className="font-black text-lg">{weekPoints} pts</span>
          </div>
          <div className="text-zinc-500">
            {correctThisWeek.length}/{gradedThisWeek.length} correct
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      <div className="sticky top-[73px] z-30 mb-8 flex items-center justify-between px-5 py-3 bg-white/95 backdrop-blur border border-zinc-200 rounded-2xl shadow-sm">
        <p className="text-sm text-zinc-500">
          <span className="font-semibold text-black">{pickedCount}</span> of {games.length} games
          picked
          {unpickedOpen > 0 && (
            <span className="ml-2 text-zinc-400">({unpickedOpen} open)</span>
          )}
        </p>
        <div className="flex items-center gap-3">
          {saveStatus === 'saved' && (
            <span className="text-sm font-semibold text-green-600">Saved!</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm font-semibold text-red-600">Error — try again</span>
          )}
          <button
            onClick={handleSave}
            disabled={isPending || unpickedOpen === games.filter((g) => g.status !== 'completed').length}
            className="px-5 py-2 bg-[#84cc16] text-black font-bold text-sm rounded-xl hover:bg-[#65a30d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving…' : 'Save Picks'}
          </button>
        </div>
      </div>

      {/* Game list */}
      {games.length === 0 ? (
        <div className="p-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
          <p className="text-zinc-500 font-medium">No games scheduled for Week {week}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => {
            const picked = picks[game.id]
            const isCompleted = game.status === 'completed'
            const result = results[game.id]
            const isGraded = result?.isCorrect !== null && result?.isCorrect !== undefined

            return (
              <div
                key={game.id}
                className="rounded-2xl border border-zinc-200 bg-white overflow-hidden"
              >
                {/* Meta row */}
                <div className="flex items-center justify-between px-5 py-2 bg-zinc-50 border-b border-zinc-100 text-xs font-medium">
                  <div className="flex items-center gap-3 text-zinc-400">
                    {game.game_date && <span>{formatGameDate(game.game_date)}</span>}
                    {game.conference_game && (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-500">
                        Conference
                      </span>
                    )}
                    {isCompleted && (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-500">
                        Final
                      </span>
                    )}
                  </div>
                  {/* Grade badge */}
                  {isGraded && (
                    <div className="flex items-center gap-2">
                      {result.isCorrect ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                          ✓ +{result.pointsAwarded} pts
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
                          ✗ 0 pts
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Matchup */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <TeamButton
                    team={game.away_team}
                    isPicked={picked === game.away_team?.id}
                    isCorrect={isGraded && picked === game.away_team?.id ? result.isCorrect : null}
                    isLocked={isCompleted}
                    onClick={() => game.away_team && handlePick(game.id, game.away_team.id)}
                  />

                  <span className="text-zinc-300 font-semibold text-sm shrink-0">
                    {game.neutral_site ? 'vs' : '@'}
                  </span>

                  <TeamButton
                    team={game.home_team}
                    isPicked={picked === game.home_team?.id}
                    isCorrect={isGraded && picked === game.home_team?.id ? result.isCorrect : null}
                    isLocked={isCompleted}
                    onClick={() => game.home_team && handlePick(game.id, game.home_team.id)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom save */}
      {games.some((g) => g.status !== 'completed') && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isPending || pickedCount === 0}
            className="px-8 py-3 bg-[#84cc16] text-black font-bold rounded-xl hover:bg-[#65a30d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving…' : 'Save All Picks'}
          </button>
        </div>
      )}
    </div>
  )
}

function TeamButton({
  team,
  isPicked,
  isCorrect,
  isLocked,
  onClick,
}: {
  team: { id: string; name: string; abbreviation: string | null } | null
  isPicked: boolean
  isCorrect: boolean | null
  isLocked: boolean
  onClick: () => void
}) {
  if (!team) {
    return <div className="flex-1 px-4 py-3 rounded-xl bg-zinc-50 text-zinc-300 text-sm">TBD</div>
  }

  let cls = 'flex-1 px-4 py-3 rounded-xl text-sm font-bold text-left transition-all border disabled:cursor-default '

  if (isPicked && isCorrect === true) {
    cls += 'bg-green-500 text-white border-green-500'
  } else if (isPicked && isCorrect === false) {
    cls += 'bg-red-400 text-white border-red-400'
  } else if (isPicked) {
    cls += 'bg-[#84cc16] text-black border-[#84cc16]'
  } else {
    cls += 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'
  }

  return (
    <button onClick={onClick} disabled={isLocked} className={cls}>
      {team.name}
      {team.abbreviation && (
        <span className={`ml-1.5 text-xs font-normal ${isPicked ? 'opacity-70' : 'text-zinc-400'}`}>
          {team.abbreviation}
        </span>
      )}
    </button>
  )
}
