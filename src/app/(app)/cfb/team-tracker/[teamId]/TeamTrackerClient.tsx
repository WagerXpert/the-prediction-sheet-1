'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { TTGame } from '@/lib/data/team-tracker'
import { saveTeamTrackerPickAction } from './actions'

interface Props {
  userId: string
  teamId: string
  games: TTGame[]
  season: number
  backHref: string
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type Team = NonNullable<TTGame['home_team']>

function TeamChip({
  team,
  isWinner,
  isLoser,
  isCurrentTeam,
}: {
  team: Team | null
  isWinner: boolean
  isLoser: boolean
  isCurrentTeam: boolean
}) {
  if (!team) return <span className="text-xs text-zinc-300 w-20">TBD</span>
  const abbr = team.abbreviation ?? team.name.slice(0, 5)
  return (
    <div className={`flex items-center gap-1.5 w-24 shrink-0 ${isLoser ? 'opacity-30' : ''}`}>
      {team.logo_url ? (
        <img src={team.logo_url} alt={abbr} className="w-4 h-4 object-contain shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: team.color ? `#${team.color}` : '#e4e4e7' }} />
      )}
      <span className={`text-xs truncate ${isCurrentTeam ? 'font-black' : 'font-medium'} ${isWinner ? 'text-[#3f6212]' : 'text-zinc-700'}`}>
        {abbr}
      </span>
    </div>
  )
}

export default function TeamTrackerClient({ teamId, games: initialGames, season, backHref }: Props) {
  const router = useRouter()

  const [picks, setPicks] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const g of initialGames) {
      if (g.user_pick) m[g.id] = g.user_pick
    }
    return m
  })
  const [savingGame, setSavingGame] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handlePick(gameId: string, teamIdPick: string) {
    setPicks(prev => ({ ...prev, [gameId]: teamIdPick }))
    setSavingGame(gameId)
    startTransition(async () => {
      await saveTeamTrackerPickAction(teamId, gameId, teamIdPick, season)
      setSavingGame(null)
      setLastSaved(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    })
  }

  // Compute projected record
  let projWins = 0, projLosses = 0, gamesLeft = 0
  for (const g of initialGames) {
    const winner = g.actual_winner ?? picks[g.id] ?? null
    if (winner) {
      if (winner === teamId) projWins++
      else projLosses++
    } else {
      gamesLeft++
    }
  }

  const completedCount = initialGames.filter(g => g.actual_winner !== null).length
  const predictedFuture = initialGames.filter(g => !g.actual_winner && picks[g.id]).length

  // Group by week
  const byWeek = new Map<number, TTGame[]>()
  for (const g of initialGames) {
    const week = g.week ?? 0
    const list = byWeek.get(week) ?? []
    list.push(g)
    byWeek.set(week, list)
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b)

  return (
    <div>
      {/* Record + save status */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          {(projWins + projLosses) > 0 ? (
            <span className="text-sm font-black">
              {projWins}–{projLosses}
              {gamesLeft > 0 && <span className="text-zinc-400 font-normal ml-1.5">projected · {gamesLeft} unpicked</span>}
              {gamesLeft === 0 && <span className="text-[#65a30d] font-normal ml-1.5">projected final</span>}
            </span>
          ) : (
            <span className="text-sm text-zinc-400">Click a team abbreviation to pick</span>
          )}
        </div>
        <div className="text-xs text-zinc-400 flex items-center gap-1.5">
          {savingGame ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] animate-pulse inline-block" />Saving…</>
          ) : lastSaved ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-[#84cc16] inline-block" />Saved {lastSaved}</>
          ) : null}
        </div>
      </div>

      {/* Progress bar */}
      {initialGames.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs font-medium text-zinc-400 mb-1.5">
            <span>{completedCount} actual · {predictedFuture} predicted</span>
            <span>{initialGames.length - completedCount - predictedFuture} remaining</span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden flex">
            <div className="h-full bg-zinc-400 transition-all duration-300" style={{ width: `${(completedCount / initialGames.length) * 100}%` }} />
            <div className="h-full bg-[#84cc16] transition-all duration-300" style={{ width: `${(predictedFuture / initialGames.length) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Game list — compact rows */}
      {initialGames.length === 0 ? (
        <div className="p-10 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
          <p className="text-zinc-500 font-medium">No schedule loaded yet.</p>
          <p className="text-sm text-zinc-400 mt-1">An admin needs to run the schedule sync.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          {weeks.map((week, wi) => {
            const weekGames = byWeek.get(week)!
            return (
              <div key={week}>
                <div className="px-4 py-1.5 bg-zinc-50 border-b border-zinc-100">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Week {week || '?'}</span>
                </div>
                {weekGames.map((game, gi) => {
                  const isCompleted = game.actual_winner !== null
                  const pickedId = picks[game.id] ?? null
                  const displayWinnerId = game.actual_winner ?? pickedId
                  const awayAbbr = game.away_team?.abbreviation ?? game.away_team?.name.slice(0, 5) ?? '?'
                  const homeAbbr = game.home_team?.abbreviation ?? game.home_team?.name.slice(0, 5) ?? '?'
                  const isSaving = savingGame === game.id
                  const isLastInWeek = gi === weekGames.length - 1
                  const isLastWeek = wi === weeks.length - 1

                  // For completed games with a user pick: was it correct?
                  const pickResult = isCompleted && pickedId
                    ? pickedId === game.actual_winner ? 'correct' : 'incorrect'
                    : null

                  return (
                    <div
                      key={game.id}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                        pickResult === 'correct' ? 'bg-[#84cc16]/5' :
                        pickResult === 'incorrect' ? 'bg-red-50/60' :
                        'hover:bg-zinc-50/60'
                      } ${!isLastInWeek || !isLastWeek ? 'border-b border-zinc-100' : ''}`}
                    >
                      {/* Date */}
                      <div className="shrink-0 w-14 text-right">
                        <span className="text-[10px] text-zinc-400">
                          {game.game_date ? formatShortDate(game.game_date) : `Wk ${week || '?'}`}
                        </span>
                      </div>

                      {/* Badges */}
                      <div className="flex gap-1 shrink-0 w-14">
                        {game.conference_game && <span className="text-[9px] font-bold text-zinc-300 uppercase">CONF</span>}
                        {isCompleted && <span className="text-[9px] font-bold text-zinc-400 uppercase">Final</span>}
                        {pickResult === 'correct' && <span className="text-[9px] font-bold text-[#65a30d] uppercase">✓</span>}
                        {pickResult === 'incorrect' && <span className="text-[9px] font-bold text-red-500 uppercase">✗</span>}
                      </div>

                      {/* Matchup */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <TeamChip
                          team={game.away_team}
                          isWinner={displayWinnerId === game.away_team?.id}
                          isLoser={displayWinnerId !== null && displayWinnerId !== game.away_team?.id}
                          isCurrentTeam={game.away_team?.id === teamId}
                        />
                        <span className="text-[10px] text-zinc-300 shrink-0">
                          {game.neutral_site ? 'vs' : '@'}
                        </span>
                        <TeamChip
                          team={game.home_team}
                          isWinner={displayWinnerId === game.home_team?.id}
                          isLoser={displayWinnerId !== null && displayWinnerId !== game.home_team?.id}
                          isCurrentTeam={game.home_team?.id === teamId}
                        />
                      </div>

                      {/* Pick area */}
                      <div className="shrink-0 flex items-center justify-end w-28">
                        {isCompleted ? (
                          <span className="text-xs font-semibold text-zinc-500 tabular-nums">
                            {game.away_team_points}–{game.home_team_points}
                          </span>
                        ) : isSaving ? (
                          <span className="text-[10px] text-zinc-300">Saving…</span>
                        ) : pickedId ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-[#65a30d]">
                              {pickedId === game.away_team?.id ? awayAbbr : homeAbbr}
                            </span>
                            <span className="text-[10px] text-[#65a30d] font-black">✓</span>
                            <button
                              onClick={() => {
                                const newPicks = { ...picks }
                                delete newPicks[game.id]
                                setPicks(newPicks)
                              }}
                              className="text-[10px] text-zinc-300 hover:text-zinc-500 ml-1 leading-none"
                              title="Clear pick"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => game.away_team && handlePick(game.id, game.away_team.id)}
                              className="px-2 py-0.5 rounded-full border border-zinc-200 text-[11px] font-semibold text-zinc-500 hover:border-[#84cc16] hover:bg-[#84cc16]/10 hover:text-[#3f6212] transition-all"
                            >
                              {awayAbbr}
                            </button>
                            <button
                              onClick={() => game.home_team && handlePick(game.id, game.home_team.id)}
                              className="px-2 py-0.5 rounded-full border border-zinc-200 text-[11px] font-semibold text-zinc-500 hover:border-[#84cc16] hover:bg-[#84cc16]/10 hover:text-[#3f6212] transition-all"
                            >
                              {homeAbbr}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Done / Save Picks */}
      {initialGames.length > 0 && (
        <div className="mt-6 pt-5 border-t border-zinc-100 flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">
            {gamesLeft === 0
              ? 'All games picked — picks save automatically.'
              : `${gamesLeft} game${gamesLeft !== 1 ? 's' : ''} still unpicked.`}
          </p>
          <button
            onClick={() => router.push(backHref)}
            className="shrink-0 px-5 py-2 bg-[#84cc16] text-black font-bold text-sm rounded-xl hover:bg-[#65a30d] transition-colors"
          >
            Done — Save Picks
          </button>
        </div>
      )}
    </div>
  )
}
