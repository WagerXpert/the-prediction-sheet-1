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
      <div className="space-y-3">
        {games.map((game) => {
          const isHome = game.home_team?.id === teamId
          const opponent = isHome ? game.away_team : game.home_team
          const pick = picks[game.id]
          const isLocked = game.status === 'completed'

          return (
            <div
              key={game.id}
              className="rounded-2xl border border-zinc-200 bg-white overflow-hidden"
            >
              {/* Meta row */}
              <div className="flex items-center gap-3 px-5 py-2 bg-zinc-50 border-b border-zinc-100 text-xs font-medium text-zinc-400">
                <span>Wk {game.week}</span>
                {game.game_date && <span>{formatDate(game.game_date)}</span>}
                {formatGameTime(game.game_date) && (
                  <span className="text-zinc-300">· {formatGameTime(game.game_date)}</span>
                )}
                {game.conference_game && (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-500">Conference</span>
                )}
                {isLocked && (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-500">Final</span>
                )}
                {!isLocked && pick && (
                  <button
                    onClick={() => handlePick(game.id, pick)}
                    className="ml-auto flex items-center gap-1 text-zinc-300 hover:text-red-400 transition-colors"
                    title="Remove pick"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>

              {/* Matchup row — your team vs opponent, like pick'em */}
              <div className="flex items-center gap-3 px-5 py-4">
                <PickButton
                  logo={team.logo_url}
                  name={team.name}
                  picked={pick === 'W'}
                  variant="win"
                  disabled={isLocked}
                  onClick={() => handlePick(game.id, 'W')}
                />
                <span className="text-zinc-300 font-semibold text-sm shrink-0">
                  {game.neutral_site ? 'vs' : isHome ? 'vs' : '@'}
                </span>
                <PickButton
                  logo={opponent?.logo_url ?? null}
                  name={opponent?.name ?? 'TBD'}
                  picked={pick === 'L'}
                  variant="loss"
                  disabled={isLocked}
                  onClick={() => handlePick(game.id, 'L')}
                />
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

function PickButton({
  logo,
  name,
  picked,
  variant,
  disabled,
  onClick,
}: {
  logo: string | null
  name: string
  picked: boolean
  variant: 'win' | 'loss'
  disabled: boolean
  onClick: () => void
}) {
  let cls = 'flex-1 px-3 py-3 rounded-xl text-sm font-bold text-left transition-all border disabled:cursor-default '

  if (picked && variant === 'win') {
    cls += 'bg-[#84cc16] text-black border-[#84cc16]'
  } else if (picked && variant === 'loss') {
    cls += 'bg-zinc-200 text-zinc-700 border-zinc-200'
  } else if (disabled) {
    cls += 'bg-zinc-50 text-zinc-400 border-zinc-200'
  } else {
    cls += 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'
  }

  return (
    <button onClick={onClick} disabled={disabled} className={cls}>
      <span className="flex items-center gap-2">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="w-7 h-7 object-contain shrink-0" />
        )}
        <span className="leading-tight">{name}</span>
      </span>
    </button>
  )
}
