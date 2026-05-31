'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CfbTeam, CfbGame } from '@/lib/data/cfb'
import { CURRENT_SEASON } from '@/lib/utils/constants'

interface Props {
  userId: string
  teamId: string
  team: CfbTeam
  games: CfbGame[]
  savedWins: number | null
}

type Result = 'W' | 'L'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function SchedulePicksForm({ userId, teamId, team, games, savedWins }: Props) {
  const [picks, setPicks] = useState<Record<string, Result>>({})
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()

  const pickedCount = Object.keys(picks).length
  const predictedWins = Object.values(picks).filter((r) => r === 'W').length
  const predictedLosses = Object.values(picks).filter((r) => r === 'L').length

  function handlePick(gameId: string, result: Result) {
    setPicks((prev) => {
      // Toggle off if same button clicked again
      if (prev[gameId] === result) {
        const next = { ...prev }
        delete next[gameId]
        return next
      }
      return { ...prev, [gameId]: result }
    })
  }

  function handleSave() {
    if (pickedCount === 0) return
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

      const wins = Object.values(picks).filter((r) => r === 'W').length
      const losses = Object.values(picks).filter((r) => r === 'L').length

      const { error } = await supabase
        .from('predictions_record')
        .upsert(
          {
            prediction_set_id: predSet.id,
            user_id: userId,
            team_id: teamId,
            predicted_wins: wins,
            predicted_losses: losses,
          },
          { onConflict: 'prediction_set_id,team_id' }
        )

      if (error) {
        setSaveStatus('error')
      } else {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    })
  }

  return (
    <div>
      {/* Saved state notice */}
      {savedWins !== null && pickedCount === 0 && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-[#84cc16]/10 border border-[#84cc16]/30 text-sm">
          <span className="font-semibold">Previously saved: {savedWins} wins.</span>
          <span className="text-zinc-500 ml-2">Pick W/L below to update your prediction.</span>
        </div>
      )}

      {/* Sticky save bar */}
      <div className="sticky top-[73px] z-30 mb-6 flex items-center justify-between px-5 py-3 bg-white/95 backdrop-blur border border-zinc-200 rounded-2xl shadow-sm">
        <div className="text-sm">
          {pickedCount > 0 ? (
            <span>
              <span className="font-black text-green-600">{predictedWins}W</span>
              <span className="text-zinc-300 mx-1">—</span>
              <span className="font-black text-red-500">{predictedLosses}L</span>
              <span className="text-zinc-400 ml-2 text-xs">({pickedCount}/{games.length} games picked)</span>
            </span>
          ) : (
            <span className="text-zinc-400">{games.length} games — pick W or L for each</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'saved' && (
            <span className="text-sm font-semibold text-green-600">Saved!</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm font-semibold text-red-600">Error — try again</span>
          )}
          <button
            onClick={handleSave}
            disabled={isPending || pickedCount === 0}
            className="px-5 py-2 bg-[#84cc16] text-black font-bold text-sm rounded-xl hover:bg-[#65a30d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving…' : 'Save Predictions'}
          </button>
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-2">
        {games.map((game) => {
          const isHome = game.home_team?.id === teamId
          const opponent = isHome ? game.away_team : game.home_team
          const pick = picks[game.id]
          const isLocked = game.status === 'completed'

          return (
            <div
              key={game.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 bg-white"
            >
              {/* Date + week */}
              <div className="w-20 shrink-0 text-center">
                <p className="text-xs font-semibold text-zinc-400 uppercase">Wk {game.week}</p>
                <p className="text-xs text-zinc-400">{formatDate(game.game_date)}</p>
              </div>

              {/* Opponent */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="text-xs font-semibold text-zinc-400 shrink-0">
                  {game.neutral_site ? 'vs' : isHome ? 'vs' : '@'}
                </span>
                {opponent?.logo_url ? (
                  <img
                    src={opponent.logo_url}
                    alt={opponent.name}
                    className="w-7 h-7 object-contain shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-zinc-100 shrink-0" />
                )}
                <span className="font-semibold text-sm truncate">
                  {opponent?.name ?? 'TBD'}
                </span>
                {game.conference_game && (
                  <span className="text-xs text-zinc-400 shrink-0">· Conf</span>
                )}
              </div>

              {/* W / L buttons */}
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => handlePick(game.id, 'W')}
                  disabled={isLocked}
                  className={`w-10 h-9 rounded-lg text-sm font-black transition-all ${
                    pick === 'W'
                      ? 'bg-green-500 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  } disabled:cursor-default`}
                >
                  W
                </button>
                <button
                  onClick={() => handlePick(game.id, 'L')}
                  disabled={isLocked}
                  className={`w-10 h-9 rounded-lg text-sm font-black transition-all ${
                    pick === 'L'
                      ? 'bg-red-500 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  } disabled:cursor-default`}
                >
                  L
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom save */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {pickedCount > 0
            ? `Predicted record: ${predictedWins}-${predictedLosses}`
            : 'No picks yet'}
        </p>
        <button
          onClick={handleSave}
          disabled={isPending || pickedCount === 0}
          className="px-6 py-2.5 bg-[#84cc16] text-black font-bold text-sm rounded-xl hover:bg-[#65a30d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Save Predictions'}
        </button>
      </div>
    </div>
  )
}
