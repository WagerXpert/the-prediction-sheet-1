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
  openWeek: number | null
  games: CfbGame[]
  existing: Record<string, string>
  results: Record<string, GamePickResult>
}

function formatGameDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatGameTime(dateStr: string | null): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return null
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

export default function GamePicksForm({ userId, week, weeks, openWeek, games, existing, results }: Props) {
  const isLocked = openWeek !== null && week !== openWeek
  const isAllComplete = openWeek === null

  const [picks, setPicks] = useState<Record<string, string>>(() => ({ ...existing }))
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()

  const unpickedOpen = games.filter((g) => g.status !== 'completed' && !picks[g.id]).length
  const pickedCount = Object.keys(picks).length

  function handlePick(gameId: string, teamId: string) {
    if (isLocked) return
    setPicks((prev) => ({ ...prev, [gameId]: teamId }))
  }

  function handleClearPick(gameId: string) {
    if (isLocked) return
    setPicks((prev) => {
      const next = { ...prev }
      delete next[gameId]
      return next
    })
  }

  function handleSave() {
    if (isLocked) return
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

      // Delete picks that were cleared (existed before but removed now)
      const clearedGameIds = games
        .filter((g) => g.status !== 'completed' && existing[g.id] && !picks[g.id])
        .map((g) => g.id)

      if (clearedGameIds.length > 0) {
        await supabase
          .from('predictions_game')
          .delete()
          .eq('prediction_set_id', predSet.id)
          .in('game_id', clearedGameIds)
      }

      const openPicks = games
        .filter((g) => g.status !== 'completed' && picks[g.id])
        .map((g) => ({
          prediction_set_id: predSet.id,
          user_id: userId,
          game_id: g.id,
          picked_team_id: picks[g.id],
        }))

      if (openPicks.length === 0 && clearedGameIds.length > 0) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
        return
      }

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
      <div className="flex flex-wrap gap-2 mb-6">
        {weeks.map((w) => {
          const isPast = openWeek !== null && w < openWeek
          const isCurrent = openWeek !== null && w === openWeek
          const isSelected = w === week

          return (
            <Link
              key={w}
              href={`/cfb/game-picks?week=${w}`}
              className={`relative px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                isSelected
                  ? 'bg-black text-white border-black'
                  : isCurrent
                  ? 'bg-[#84cc16]/10 text-[#3f6212] border-[#84cc16] hover:bg-[#84cc16]/20'
                  : isPast
                  ? 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300'
                  : 'bg-zinc-50 text-zinc-300 border-zinc-100 cursor-default pointer-events-none'
              }`}
            >
              {w === 0 ? 'Week 0' : `Week ${w}`}
              {isCurrent && !isSelected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#84cc16]" />
              )}
              {isPast && <span className="ml-1.5 text-[10px] text-zinc-300">✓</span>}
              {openWeek === null || w > openWeek ? <span className="ml-1.5 text-[10px] opacity-50">🔒</span> : null}
            </Link>
          )
        })}
      </div>

      {/* Lock banner for past/future weeks */}
      {isLocked && !isAllComplete && (
        <div className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
          <span className="text-base shrink-0 mt-0.5">🔒</span>
          <div>
            <p className="text-sm font-bold text-zinc-700">
              {openWeek !== null && week < openWeek
                ? `Week ${week} is complete — picks are locked.`
                : `Week ${week} isn't open yet.`}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {openWeek !== null && week < openWeek
                ? 'You can review your picks and results below.'
                : `Week ${openWeek} is the current open week. Picks unlock when Week ${openWeek} finishes.`}
            </p>
            {openWeek !== null && (
              <Link
                href={`/cfb/game-picks?week=${openWeek}`}
                className="inline-block mt-2 text-xs font-bold text-[#65a30d] hover:underline"
              >
                Go to Week {openWeek} →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Week score summary */}
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

      {/* Sticky save bar — only shown when week is open */}
      {!isLocked && !isAllComplete && (
        <div className="sticky top-[73px] z-30 mb-8 flex items-center justify-between px-5 py-3 bg-white/95 backdrop-blur border border-zinc-200 rounded-2xl shadow-sm">
          <p className="text-sm text-zinc-500">
            <span className="font-semibold text-black">{pickedCount}</span> of {games.length} games picked
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
      )}

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
            const gameIsPickable = !isLocked && !isCompleted

            return (
              <div
                key={game.id}
                className="rounded-2xl border border-zinc-200 bg-white overflow-hidden"
              >
                {/* Meta row */}
                <div className="flex items-center justify-between px-5 py-2 bg-zinc-50 border-b border-zinc-100 text-xs font-medium">
                  <div className="flex items-center gap-3 text-zinc-400">
                    {game.game_date && <span>{formatGameDate(game.game_date)}</span>}
                    {formatGameTime(game.game_date) && (
                      <span className="text-zinc-300">· {formatGameTime(game.game_date)}</span>
                    )}
                    {game.conference_game && (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-500">Conference</span>
                    )}
                    {isCompleted && (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-500">Final</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {gameIsPickable && picked && (
                      <button
                        onClick={() => handleClearPick(game.id)}
                        className="text-zinc-300 hover:text-red-400 transition-colors"
                        title="Remove pick"
                      >
                        <TrashIcon />
                      </button>
                    )}
                    {isGraded && (
                      result.isCorrect ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                          ✓ +{result.pointsAwarded} pts
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
                          ✗ 0 pts
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Matchup */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <TeamButton
                    team={game.away_team}
                    isPicked={picked === game.away_team?.id}
                    isCorrect={isGraded && picked === game.away_team?.id ? result.isCorrect : null}
                    isLocked={!gameIsPickable}
                    onClick={() => game.away_team && handlePick(game.id, game.away_team.id)}
                  />
                  <span className="text-zinc-300 font-semibold text-sm shrink-0">
                    {game.neutral_site ? 'vs' : '@'}
                  </span>
                  <TeamButton
                    team={game.home_team}
                    isPicked={picked === game.home_team?.id}
                    isCorrect={isGraded && picked === game.home_team?.id ? result.isCorrect : null}
                    isLocked={!gameIsPickable}
                    onClick={() => game.home_team && handlePick(game.id, game.home_team.id)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom save — only when week is open */}
      {!isLocked && !isAllComplete && games.some((g) => g.status !== 'completed') && (
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
  team: { id: string; name: string; abbreviation: string | null; logo_url?: string | null } | null
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
  } else if (isLocked) {
    cls += 'bg-zinc-50 text-zinc-400 border-zinc-200'
  } else {
    cls += 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'
  }

  return (
    <button onClick={onClick} disabled={isLocked} className={cls}>
      <span className="flex items-center gap-2.5">
        {team.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.logo_url}
            alt=""
            className="w-8 h-8 object-contain shrink-0"
          />
        )}
        <span>
          {team.name}
          {team.abbreviation && (
            <span className={`ml-1.5 text-xs font-normal ${isPicked ? 'opacity-70' : 'text-zinc-400'}`}>
              {team.abbreviation}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
